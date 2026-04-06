use std::path::{Path, PathBuf};
use std::io::Read;
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

/// Extract native DLLs from native library JARs into the natives directory.
/// MC 1.19+ uses separate library entries with "natives-windows" in the name.
/// Older versions use the `natives` field with classifiers.
pub fn extract_natives(version: &VersionJson, libraries_dir: &Path, natives_dir: &Path) -> Result<(), String> {
    for lib in &version.libraries {
        if !check_library_rules(&lib.rules) {
            continue;
        }

        let is_native = lib.name.contains("natives-windows")
            || lib.natives.is_some();

        if !is_native {
            continue;
        }

        // Find the JAR path
        let jar_path = if let Some(ref downloads) = lib.downloads {
            if let Some(ref natives_map) = lib.natives {
                // Old style: use classifier
                if let Some(classifier_key) = natives_map.get("windows") {
                    downloads.classifiers.as_ref()
                        .and_then(|c| c.get(classifier_key))
                        .map(|a| libraries_dir.join(&a.path))
                } else {
                    None
                }
            } else if let Some(ref artifact) = downloads.artifact {
                Some(libraries_dir.join(&artifact.path))
            } else {
                None
            }
        } else {
            let rel_path = get_library_path(&lib.name);
            Some(libraries_dir.join(&rel_path))
        };

        if let Some(jar_path) = jar_path {
            if jar_path.exists() {
                if let Err(e) = extract_dll_from_jar(&jar_path, natives_dir) {
                    log::warn!("Failed to extract natives from {:?}: {}", jar_path, e);
                }
            }
        }
    }

    Ok(())
}

fn extract_dll_from_jar(jar_path: &Path, natives_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(jar_path)
        .map_err(|e| format!("Cannot open {}: {}", jar_path.display(), e))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Invalid JAR {}: {}", jar_path.display(), e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("Zip entry error: {}", e))?;

        let name = entry.name().to_string();
        // Extract .dll, .so, .dylib files (skip META-INF and directories)
        if name.ends_with(".dll") || name.ends_with(".so") || name.ends_with(".dylib") {
            let filename = Path::new(&name)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or(name.clone());

            let target = natives_dir.join(&filename);
            if !target.exists() {
                let mut buf = Vec::new();
                entry.read_to_end(&mut buf)
                    .map_err(|e| format!("Failed to read {}: {}", name, e))?;
                std::fs::write(&target, &buf)
                    .map_err(|e| format!("Failed to write {}: {}", target.display(), e))?;
                log::info!("Extracted native: {}", filename);
            }
        }
    }

    Ok(())
}
