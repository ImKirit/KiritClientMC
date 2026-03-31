use std::path::{Path, PathBuf};
use super::versions::{Library, VersionJson, check_library_rules};
use super::download::DownloadTask;

const LIBRARIES_URL: &str = "https://libraries.minecraft.net/";

pub fn get_library_path(name: &str) -> String {
    // Maven coordinate: group:artifact:version -> group/artifact/version/artifact-version.jar
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() >= 3 {
        let group = parts[0].replace('.', "/");
        let artifact = parts[1];
        let version = parts[2];
        format!("{}/{}/{}/{}-{}.jar", group, artifact, version, artifact, version)
    } else {
        name.to_string()
    }
}

pub fn collect_library_tasks(version: &VersionJson, libraries_dir: &Path) -> Vec<DownloadTask> {
    let mut tasks = Vec::new();

    for lib in &version.libraries {
        if !check_library_rules(&lib.rules) {
            continue;
        }

        if let Some(ref downloads) = lib.downloads {
            if let Some(ref artifact) = downloads.artifact {
                let path = libraries_dir.join(&artifact.path);
                tasks.push(DownloadTask {
                    url: artifact.url.clone(),
                    path: path.to_string_lossy().to_string(),
                    sha1: Some(artifact.sha1.clone()),
                    size: artifact.size,
                });
            }

            // Natives for Windows
            if let Some(ref natives) = lib.natives {
                if let Some(classifier_key) = natives.get("windows") {
                    if let Some(ref classifiers) = downloads.classifiers {
                        if let Some(native_artifact) = classifiers.get(classifier_key) {
                            let path = libraries_dir.join(&native_artifact.path);
                            tasks.push(DownloadTask {
                                url: native_artifact.url.clone(),
                                path: path.to_string_lossy().to_string(),
                                sha1: Some(native_artifact.sha1.clone()),
                                size: native_artifact.size,
                            });
                        }
                    }
                }
            }
        } else if let Some(ref url_base) = lib.url {
            // Fabric/Forge libraries without download info
            let rel_path = get_library_path(&lib.name);
            let url = format!("{}{}", url_base, rel_path);
            let path = libraries_dir.join(&rel_path);
            tasks.push(DownloadTask {
                url,
                path: path.to_string_lossy().to_string(),
                sha1: None,
                size: 0,
            });
        } else {
            // Default Maven repo
            let rel_path = get_library_path(&lib.name);
            let url = format!("{}{}", LIBRARIES_URL, rel_path);
            let path = libraries_dir.join(&rel_path);
            tasks.push(DownloadTask {
                url,
                path: path.to_string_lossy().to_string(),
                sha1: None,
                size: 0,
            });
        }
    }

    tasks
}

pub fn build_classpath(version: &VersionJson, libraries_dir: &Path, client_jar: &Path) -> String {
    let mut paths: Vec<String> = Vec::new();

    for lib in &version.libraries {
        if !check_library_rules(&lib.rules) {
            continue;
        }

        if let Some(ref downloads) = lib.downloads {
            if let Some(ref artifact) = downloads.artifact {
                let path = libraries_dir.join(&artifact.path);
                paths.push(path.to_string_lossy().to_string());
            }
        } else {
            let rel_path = get_library_path(&lib.name);
            let path = libraries_dir.join(&rel_path);
            paths.push(path.to_string_lossy().to_string());
        }
    }

    paths.push(client_jar.to_string_lossy().to_string());
    paths.join(";") // Windows separator
}
