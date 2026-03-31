use reqwest::Client;
use sha1::{Sha1, Digest};
use std::path::Path;
use tokio::sync::Semaphore;
use std::sync::Arc;

pub struct DownloadTask {
    pub url: String,
    pub path: String,
    pub sha1: Option<String>,
    pub size: u64,
}

pub async fn download_file(client: &Client, url: &str, path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create dir: {}", e))?;
    }

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download failed for {}: {}", url, e))?;

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read bytes: {}", e))?;

    tokio::fs::write(path, &bytes)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

pub fn verify_sha1(path: &Path, expected: &str) -> bool {
    if let Ok(data) = std::fs::read(path) {
        let mut hasher = Sha1::new();
        hasher.update(&data);
        let result = hasher.finalize();
        let hex = format!("{:x}", result);
        hex == expected
    } else {
        false
    }
}

pub async fn download_if_missing(client: &Client, url: &str, path: &Path, sha1: Option<&str>) -> Result<bool, String> {
    if path.exists() {
        if let Some(expected_sha1) = sha1 {
            if verify_sha1(path, expected_sha1) {
                return Ok(false); // Already exists and valid
            }
        } else {
            return Ok(false); // No hash check, file exists
        }
    }

    download_file(client, url, path).await?;
    Ok(true) // Downloaded
}

pub async fn download_batch(
    client: &Client,
    tasks: Vec<DownloadTask>,
    max_concurrent: usize,
    progress_callback: impl Fn(usize, usize, &str) + Send + Sync + 'static,
) -> Result<(), String> {
    let semaphore = Arc::new(Semaphore::new(max_concurrent));
    let client = client.clone();
    let total = tasks.len();
    let completed = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let callback = Arc::new(progress_callback);

    let mut handles = Vec::new();

    for task in tasks {
        let sem = semaphore.clone();
        let client = client.clone();
        let completed = completed.clone();
        let callback = callback.clone();

        let handle = tokio::spawn(async move {
            let _permit = sem.acquire().await.map_err(|e| format!("Semaphore error: {}", e))?;
            let path = Path::new(&task.path);

            download_if_missing(&client, &task.url, path, task.sha1.as_deref()).await?;

            let done = completed.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
            callback(done, total, &task.url);

            Ok::<(), String>(())
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.await.map_err(|e| format!("Task join error: {}", e))??;
    }

    Ok(())
}
