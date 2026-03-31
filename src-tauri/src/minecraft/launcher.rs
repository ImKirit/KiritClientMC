use std::path::{Path, PathBuf};
use std::collections::HashMap;
use tokio::process::Command;
use super::versions::VersionJson;
use super::libraries::build_classpath;

pub struct LaunchConfig {
    pub java_path: String,
    pub memory_mb: u32,
    pub jvm_args: Vec<String>,
    pub game_args: Vec<String>,
    pub game_dir: PathBuf,
    pub natives_dir: PathBuf,
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub version_name: String,
    pub assets_dir: PathBuf,
    pub asset_index: String,
    pub resolution_width: u32,
    pub resolution_height: u32,
}

pub fn build_game_arguments(version: &VersionJson, config: &LaunchConfig) -> Vec<String> {
    let mut args = Vec::new();

    let vars: HashMap<&str, String> = HashMap::from([
        ("auth_player_name", config.username.clone()),
        ("version_name", config.version_name.clone()),
        ("game_directory", config.game_dir.to_string_lossy().to_string()),
        ("assets_root", config.assets_dir.to_string_lossy().to_string()),
        ("assets_index_name", config.asset_index.clone()),
        ("auth_uuid", config.uuid.replace("-", "")),
        ("auth_access_token", config.access_token.clone()),
        ("user_type", "msa".to_string()),
        ("version_type", version.version_type.clone()),
        ("resolution_width", config.resolution_width.to_string()),
        ("resolution_height", config.resolution_height.to_string()),
    ]);

    if let Some(ref arguments) = version.arguments {
        if let Some(ref game_args) = arguments.game {
            for arg in game_args {
                match arg {
                    serde_json::Value::String(s) => {
                        args.push(substitute_vars(s, &vars));
                    },
                    serde_json::Value::Object(obj) => {
                        // Conditional arguments - check rules
                        if let Some(serde_json::Value::Array(values)) = obj.get("value") {
                            for v in values {
                                if let Some(s) = v.as_str() {
                                    args.push(substitute_vars(s, &vars));
                                }
                            }
                        } else if let Some(serde_json::Value::String(s)) = obj.get("value") {
                            args.push(substitute_vars(s, &vars));
                        }
                    },
                    _ => {}
                }
            }
        }
    } else if let Some(ref mc_args) = version.minecraft_arguments {
        // Legacy format (pre-1.13)
        for arg in mc_args.split_whitespace() {
            args.push(substitute_vars(arg, &vars));
        }
    }

    args
}

pub fn build_jvm_arguments(version: &VersionJson, config: &LaunchConfig, classpath: &str) -> Vec<String> {
    let mut args = Vec::new();

    let vars: HashMap<&str, String> = HashMap::from([
        ("natives_directory", config.natives_dir.to_string_lossy().to_string()),
        ("launcher_name", "KiritClient".to_string()),
        ("launcher_version", "0.1.0".to_string()),
        ("classpath", classpath.to_string()),
    ]);

    // Memory
    args.push(format!("-Xmx{}m", config.memory_mb));
    args.push(format!("-Xms{}m", config.memory_mb / 2));

    // Natives
    args.push(format!("-Djava.library.path={}", config.natives_dir.to_string_lossy()));

    // Modern MC JVM args from version JSON
    if let Some(ref arguments) = version.arguments {
        if let Some(ref jvm_args) = arguments.jvm {
            for arg in jvm_args {
                match arg {
                    serde_json::Value::String(s) => {
                        let substituted = substitute_vars(s, &vars);
                        if !substituted.starts_with("-Xmx") && !substituted.starts_with("-Xms") && !substituted.contains("java.library.path") {
                            args.push(substituted);
                        }
                    },
                    serde_json::Value::Object(obj) => {
                        // Check rules for OS-specific args
                        if let Some(serde_json::Value::Array(rules)) = obj.get("rules") {
                            let mut applies = false;
                            for rule in rules {
                                if let Some(os) = rule.get("os") {
                                    if let Some(name) = os.get("name").and_then(|n| n.as_str()) {
                                        if name == "windows" {
                                            applies = rule.get("action").and_then(|a| a.as_str()) == Some("allow");
                                        }
                                    }
                                }
                            }
                            if applies {
                                if let Some(serde_json::Value::Array(values)) = obj.get("value") {
                                    for v in values {
                                        if let Some(s) = v.as_str() {
                                            args.push(substitute_vars(s, &vars));
                                        }
                                    }
                                } else if let Some(serde_json::Value::String(s)) = obj.get("value") {
                                    args.push(substitute_vars(s, &vars));
                                }
                            }
                        }
                    },
                    _ => {}
                }
            }
        }
    }

    // Extra user JVM args
    for arg in &config.jvm_args {
        if !arg.is_empty() {
            args.push(arg.clone());
        }
    }

    // Classpath
    args.push("-cp".to_string());
    args.push(classpath.to_string());

    args
}

fn substitute_vars(template: &str, vars: &HashMap<&str, String>) -> String {
    let mut result = template.to_string();
    for (key, value) in vars {
        result = result.replace(&format!("${{{}}}", key), value);
    }
    result
}

pub async fn launch_minecraft(
    version: &VersionJson,
    config: &LaunchConfig,
    libraries_dir: &Path,
    client_jar: &Path,
) -> Result<u32, String> {
    let classpath = build_classpath(version, libraries_dir, client_jar);
    let jvm_args = build_jvm_arguments(version, config, &classpath);
    let game_args = build_game_arguments(version, config);

    // Create game directory
    tokio::fs::create_dir_all(&config.game_dir)
        .await
        .map_err(|e| format!("Failed to create game dir: {}", e))?;

    let mut cmd = Command::new(&config.java_path);
    cmd.args(&jvm_args);
    cmd.arg(&version.main_class);
    cmd.args(&game_args);
    cmd.current_dir(&config.game_dir);

    log::info!("Launching: {} {} {} {}", config.java_path, jvm_args.join(" "), version.main_class, game_args.join(" "));

    let child = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch Minecraft: {}", e))?;

    let pid = child.id().unwrap_or(0);

    // Spawn task to read output
    tokio::spawn(async move {
        let output = child.wait_with_output().await;
        match output {
            Ok(o) => {
                if !o.status.success() {
                    log::error!("Minecraft exited with: {}", o.status);
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    if !stderr.is_empty() {
                        log::error!("stderr: {}", stderr);
                    }
                } else {
                    log::info!("Minecraft exited normally");
                }
            },
            Err(e) => log::error!("Failed to wait for Minecraft: {}", e),
        }
    });

    Ok(pid)
}
