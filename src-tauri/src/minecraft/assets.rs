use std::path::Path;
use reqwest::Client;
use super::versions::AssetIndexJson;
use super::download::DownloadTask;

const ASSET_BASE_URL: &str = "https://resources.download.minecraft.net/";

pub async fn fetch_asset_index(client: &Client, url: &str) -> Result<AssetIndexJson, String> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch asset index: {}", e))?;

    resp.json::<AssetIndexJson>()
        .await
        .map_err(|e| format!("Failed to parse asset index: {}", e))
}

pub fn collect_asset_tasks(assets: &AssetIndexJson, assets_dir: &Path) -> Vec<DownloadTask> {
    let mut tasks = Vec::new();
    let objects_dir = assets_dir.join("objects");

    for (_name, obj) in &assets.objects {
        let prefix = &obj.hash[..2];
        let path = objects_dir.join(prefix).join(&obj.hash);
        let url = format!("{}{}/{}", ASSET_BASE_URL, prefix, obj.hash);

        tasks.push(DownloadTask {
            url,
            path: path.to_string_lossy().to_string(),
            sha1: Some(obj.hash.clone()),
            size: obj.size,
        });
    }

    tasks
}
