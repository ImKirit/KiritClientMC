mod state;
mod auth;
mod minecraft;
mod profiles;
mod modloaders;

use state::*;
use auth::microsoft;
use minecraft::{versions, assets, libraries, download, java, launcher};
use profiles::manager;
use modloaders::fabric;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex;

// ---- Auth Commands ----

#[tauri::command]
async fn ms_auth_start(_state: State<'_, AppState>) -> Result<microsoft::DeviceCodeResponse, String> {
    let client = reqwest::Client::new();
    microsoft::request_device_code(&client).await
}

#[tauri::command]
async fn ms_auth_poll(device_code: String, state: State<'_, AppState>) -> Result<Option<microsoft::AuthResult>, String> {
    let client = reqwest::Client::new();
    let token = microsoft::poll_for_token(&client, &device_code).await?;

    match token {
        Some(ms_token) => {
            let refresh = ms_token.refresh_token.clone().unwrap_or_default();
            let result = microsoft::full_auth_chain(&client, &ms_token.access_token, &refresh).await?;

            // Save account
            let mut accounts = state.accounts.lock().await;
            // Deactivate all others
            for acc in accounts.iter_mut() {
                acc.is_active = false;
            }
            // Remove if exists (re-login)
            accounts.retain(|a| a.uuid != result.uuid);
            accounts.push(Account {
                uuid: result.uuid.clone(),
                username: result.username.clone(),
                skin_url: result.skin_url.clone(),
                access_token: result.access_token.clone(),
                refresh_token: result.refresh_token.clone(),
                is_active: true,
            });

            save_accounts(&state).await?;

            Ok(Some(result))
        },
        None => Ok(None),
    }
}

#[tauri::command]
async fn get_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, String> {
    let accounts = state.accounts.lock().await;
    Ok(accounts.clone())
}

#[tauri::command]
async fn remove_account(uuid: String, state: State<'_, AppState>) -> Result<(), String> {
    // Remove tokens from credential manager
    let key = format!("kiritclient-{}", uuid);
    if let Ok(entry) = keyring::Entry::new("kiritclient", &key) {
        let _ = entry.delete_credential();
    }

    let mut accounts = state.accounts.lock().await;
    accounts.retain(|a| a.uuid != uuid);
    if !accounts.is_empty() && !accounts.iter().any(|a| a.is_active) {
        accounts[0].is_active = true;
    }
    drop(accounts);
    save_accounts(&state).await
}

#[tauri::command]
async fn set_active_account(uuid: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut accounts = state.accounts.lock().await;
    for acc in accounts.iter_mut() {
        acc.is_active = acc.uuid == uuid;
    }
    drop(accounts);
    save_accounts(&state).await
}

// ---- Version Commands ----

#[tauri::command]
async fn fetch_versions() -> Result<Vec<versions::VersionEntry>, String> {
    let client = reqwest::Client::new();
    let manifest = versions::fetch_version_manifest(&client).await?;
    Ok(manifest.versions)
}

// ---- Fabric Commands ----

#[tauri::command]
async fn fetch_fabric_versions(mc_version: String) -> Result<Vec<fabric::FabricLoaderVersion>, String> {
    let client = reqwest::Client::new();
    fabric::fetch_fabric_loader_versions(&client, &mc_version).await
}

// ---- Profile Commands ----

#[tauri::command]
async fn get_profiles(state: State<'_, AppState>) -> Result<Vec<Profile>, String> {
    let profiles = state.profiles.lock().await;
    Ok(profiles.clone())
}

#[tauri::command]
async fn create_profile(profile: Profile, state: State<'_, AppState>) -> Result<Profile, String> {
    let mut profiles = state.profiles.lock().await;
    let new_profile = Profile {
        id: uuid::Uuid::new_v4().to_string(),
        created: chrono::Utc::now().to_rfc3339(),
        ..profile
    };
    profiles.push(new_profile.clone());
    drop(profiles);
    save_profiles_to_disk(&state).await?;
    Ok(new_profile)
}

#[tauri::command]
async fn update_profile(profile: Profile, state: State<'_, AppState>) -> Result<(), String> {
    let mut profiles = state.profiles.lock().await;
    if let Some(p) = profiles.iter_mut().find(|p| p.id == profile.id) {
        *p = profile;
    }
    drop(profiles);
    save_profiles_to_disk(&state).await
}

#[tauri::command]
async fn delete_profile(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut profiles = state.profiles.lock().await;
    profiles.retain(|p| p.id != id);
    drop(profiles);
    save_profiles_to_disk(&state).await
}

// ---- Resource Commands ----

#[tauri::command]
async fn get_instance_resources(profile_id: String, state: State<'_, AppState>) -> Result<Vec<InstanceResource>, String> {
    let path = state.data_dir.join("instances").join(&profile_id).join("resources.json");
    if !path.exists() {
        return Ok(vec![]);
    }
    let data = tokio::fs::read_to_string(&path).await.map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_instance_resources(profile_id: String, resources: Vec<InstanceResource>, state: State<'_, AppState>) -> Result<(), String> {
    let dir = state.data_dir.join("instances").join(&profile_id);
    tokio::fs::create_dir_all(&dir).await.map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(&resources).map_err(|e| e.to_string())?;
    tokio::fs::write(dir.join("resources.json"), data).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn resolve_modrinth_version(slug: String, mc_version: String, loader_type: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let loaders = if loader_type == "vanilla" {
        "[]".to_string()
    } else {
        format!("[\"{}\"]", loader_type)
    };
    let url = format!(
        "https://api.modrinth.com/v2/project/{}/version?game_versions=[\"{}\"]&loaders={}",
        slug, mc_version, loaders
    );
    let resp = client.get(&url)
        .header("User-Agent", "KiritClient/0.1.0")
        .send().await.map_err(|e| e.to_string())?;
    let versions: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    versions.into_iter().next().ok_or("No compatible version found".to_string())
}

// ---- Settings Commands ----

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let settings = state.settings.lock().await;
    Ok(settings.clone())
}

#[tauri::command]
async fn update_settings(settings: Settings, state: State<'_, AppState>) -> Result<(), String> {
    let mut s = state.settings.lock().await;
    *s = settings;
    drop(s);
    save_settings_to_disk(&state).await
}

#[tauri::command]
async fn detect_java() -> Result<Vec<(String, String)>, String> {
    Ok(java::detect_java_installations())
}

// ---- Launch Command ----

#[tauri::command]
async fn launch_game(profile_id: String, app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let client = reqwest::Client::new();
    let data_dir = state.data_dir.clone();

    // Get profile
    let profiles = state.profiles.lock().await;
    let profile = profiles.iter().find(|p| p.id == profile_id)
        .ok_or("Profile not found")?
        .clone();
    drop(profiles);

    // Get active account
    let accounts = state.accounts.lock().await;
    let account = accounts.iter().find(|a| a.is_active)
        .ok_or("No active account")?
        .clone();
    drop(accounts);

    // Refresh token before launch
    emit_progress(&app, serde_json::json!({
        "stage": "auth",
        "message": "Refreshing authentication...",
        "progress": 0.0
    }));

    let account = if !account.refresh_token.is_empty() {
        match microsoft::refresh_ms_token(&client, &account.refresh_token).await {
            Ok(ms_token) => {
                let refresh = ms_token.refresh_token.clone().unwrap_or(account.refresh_token.clone());
                match microsoft::full_auth_chain(&client, &ms_token.access_token, &refresh).await {
                    Ok(result) => {
                        // Update stored account with new tokens
                        let mut accounts = state.accounts.lock().await;
                        if let Some(acc) = accounts.iter_mut().find(|a| a.uuid == account.uuid) {
                            acc.access_token = result.access_token.clone();
                            acc.refresh_token = result.refresh_token.clone();
                        }
                        drop(accounts);
                        save_accounts(&state).await?;

                        Account {
                            uuid: result.uuid,
                            username: result.username,
                            skin_url: result.skin_url,
                            access_token: result.access_token,
                            refresh_token: result.refresh_token,
                            is_active: true,
                        }
                    },
                    Err(e) => {
                        log::warn!("Auth chain refresh failed, using existing token: {}", e);
                        account
                    }
                }
            },
            Err(e) => {
                log::warn!("Token refresh failed, using existing token: {}", e);
                account
            }
        }
    } else {
        account
    };

    let settings = state.settings.lock().await.clone();

    // Emit progress
    emit_progress(&app, serde_json::json!({
        "stage": "versions",
        "message": "Fetching version info...",
        "progress": 0.0
    }));

    // Fetch version manifest and version JSON
    let manifest = versions::fetch_version_manifest(&client).await?;
    let version_entry = manifest.versions.iter()
        .find(|v| v.id == profile.mc_version)
        .ok_or(format!("Version {} not found", profile.mc_version))?;

    let mut version_json = versions::fetch_version_json(&client, &version_entry.url).await?;

    // Fabric integration: merge Fabric libraries + override main class
    // For Vanilla profiles, silently install Fabric so KiritClient mod works
    let needs_fabric = profile.loader_type == state::LoaderType::Fabric
        || profile.loader_type == state::LoaderType::Vanilla;

    if needs_fabric {
        let stage_msg = if profile.loader_type == state::LoaderType::Vanilla {
            "Setting up KiritClient..."
        } else {
            "Setting up Fabric loader..."
        };
        emit_progress(&app, serde_json::json!({
            "stage": "fabric",
            "message": stage_msg,
            "progress": 0.05
        }));

        // Determine loader version
        let loader_version = if let Some(ref lv) = profile.loader_version {
            lv.clone()
        } else {
            // Fetch latest stable
            let fabric_versions = fabric::fetch_fabric_loader_versions(&client, &profile.mc_version).await?;
            fabric_versions.iter()
                .find(|v| v.loader.stable)
                .or(fabric_versions.first())
                .map(|v| v.loader.version.clone())
                .ok_or("No Fabric loader versions available")?
        };

        let fabric_json = fabric::fetch_fabric_version_json(&client, &profile.mc_version, &loader_version).await?;

        // Override main class
        version_json.main_class = fabric_json.main_class;

        // Add Fabric libraries (they use url field, handled by collect_library_tasks)
        for flib in fabric_json.libraries {
            version_json.libraries.push(versions::Library {
                name: flib.name,
                downloads: None,
                rules: None,
                natives: None,
                url: flib.url,
            });
        }
    }

    // Setup directories
    let versions_dir = data_dir.join("versions").join(&profile.mc_version);
    let libraries_dir = data_dir.join("libraries");
    let assets_dir = data_dir.join("assets");
    let instances_dir = data_dir.join("instances");
    let game_dir = if profile.game_dir.is_empty() {
        instances_dir.join(&profile.id)
    } else {
        instances_dir.join(&profile.game_dir)
    };
    let natives_dir = versions_dir.join("natives");

    tokio::fs::create_dir_all(&versions_dir).await.map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&libraries_dir).await.map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&assets_dir).await.map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&game_dir).await.map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&natives_dir).await.map_err(|e| e.to_string())?;

    // Download client JAR
    emit_progress(&app, serde_json::json!({
        "stage": "client",
        "message": "Downloading client...",
        "progress": 0.1
    }));

    let client_jar = versions_dir.join(format!("{}.jar", profile.mc_version));
    download::download_if_missing(
        &client,
        &version_json.downloads.client.url,
        &client_jar,
        Some(&version_json.downloads.client.sha1),
    ).await?;

    // Download libraries
    emit_progress(&app, serde_json::json!({
        "stage": "libraries",
        "message": "Downloading libraries...",
        "progress": 0.3
    }));

    let lib_tasks = libraries::collect_library_tasks(&version_json, &libraries_dir);
    let app_clone = app.clone();
    download::download_batch(&client, lib_tasks, settings.download_threads as usize, move |done, total, _url| {
        emit_progress(&app_clone, serde_json::json!({
            "stage": "libraries",
            "message": format!("Libraries: {}/{}", done, total),
            "progress": 0.3 + (done as f64 / total as f64) * 0.2
        }));
    }).await?;

    // Download assets
    emit_progress(&app, serde_json::json!({
        "stage": "assets",
        "message": "Downloading assets...",
        "progress": 0.5
    }));

    let asset_index_path = assets_dir.join("indexes").join(format!("{}.json", version_json.asset_index.id));
    download::download_if_missing(
        &client,
        &version_json.asset_index.url,
        &asset_index_path,
        Some(&version_json.asset_index.sha1),
    ).await?;

    let asset_index = assets::fetch_asset_index(&client, &version_json.asset_index.url).await?;
    let asset_tasks = assets::collect_asset_tasks(&asset_index, &assets_dir);
    let app_clone = app.clone();
    download::download_batch(&client, asset_tasks, settings.download_threads as usize, move |done, total, _url| {
        emit_progress(&app_clone, serde_json::json!({
            "stage": "assets",
            "message": format!("Assets: {}/{}", done, total),
            "progress": 0.5 + (done as f64 / total as f64) * 0.3
        }));
    }).await?;

    // Download mods/resources for this instance
    let resources_path = game_dir.join("resources.json");
    if resources_path.exists() {
        if let Ok(data) = tokio::fs::read_to_string(&resources_path).await {
            if let Ok(resources) = serde_json::from_str::<Vec<InstanceResource>>(&data) {
                let enabled: Vec<_> = resources.iter().filter(|r| r.enabled).collect();
                if !enabled.is_empty() {
                    emit_progress(&app, serde_json::json!({
                        "stage": "mods",
                        "message": format!("Installing {} resources...", enabled.len()),
                        "progress": 0.82
                    }));

                    for resource in &enabled {
                        if let (Some(file_url), Some(file_name)) = (&resource.file_url, &resource.file_name) {
                            let target_dir = match resource.resource_type.as_str() {
                                "mod" => game_dir.join("mods"),
                                "resourcepack" => game_dir.join("resourcepacks"),
                                "shader" => game_dir.join("shaderpacks"),
                                _ => continue,
                            };
                            tokio::fs::create_dir_all(&target_dir).await.ok();
                            let target_file = target_dir.join(file_name);
                            if !target_file.exists() {
                                download::download_if_missing(&client, file_url, &target_file, None).await.ok();
                            }
                        }
                    }
                }
            }
        }
    }

    // Auto-install KiritClient mod into instance
    if needs_fabric {
        let mods_dir = game_dir.join("mods");
        tokio::fs::create_dir_all(&mods_dir).await.ok();
        let target_jar = mods_dir.join("kiritclient-mod.jar");

        // Copy bundled mod from app resources
        let resource_path = app.path().resource_dir()
            .map_err(|e| e.to_string())?
            .join("resources")
            .join("kiritclient-mod.jar");

        if resource_path.exists() {
            if let Err(e) = tokio::fs::copy(&resource_path, &target_jar).await {
                log::warn!("[Launch] Failed to install KiritClient mod: {}", e);
            } else {
                log::info!("[Launch] KiritClient mod installed to {:?}", target_jar);
            }
        } else {
            log::warn!("[Launch] KiritClient mod not found at {:?}", resource_path);
        }
    }

    // Find Java
    emit_progress(&app, serde_json::json!({
        "stage": "java",
        "message": "Finding Java...",
        "progress": 0.85
    }));

    let java_path = if let Some(ref jp) = profile.java_path {
        jp.clone()
    } else {
        let installations = java::detect_java_installations();
        java::find_java_for_version(&profile.mc_version, &installations)
            .ok_or("No compatible Java found. Please install Java or set a Java path in profile settings.")?
    };

    // Launch
    emit_progress(&app, serde_json::json!({
        "stage": "launching",
        "message": "Starting Minecraft...",
        "progress": 0.95
    }));

    let launch_config = launcher::LaunchConfig {
        java_path,
        memory_mb: profile.memory_mb,
        jvm_args: profile.jvm_args.split_whitespace().map(|s| s.to_string()).collect(),
        game_args: profile.game_args.split_whitespace().map(|s| s.to_string()).collect(),
        game_dir,
        natives_dir,
        username: account.username,
        uuid: account.uuid,
        access_token: account.access_token,
        version_name: profile.mc_version.clone(),
        assets_dir,
        asset_index: version_json.asset_index.id.clone(),
        resolution_width: profile.resolution_width,
        resolution_height: profile.resolution_height,
    };

    let pid = launcher::launch_minecraft(&version_json, &launch_config, &libraries_dir, &client_jar).await?;

    emit_progress(&app, serde_json::json!({
        "stage": "running",
        "message": "Minecraft is running!",
        "progress": 1.0,
        "pid": pid
    }));

    Ok(())
}

// ---- Import/Export Commands ----

#[tauri::command]
async fn import_mrpack(file_path: String, state: State<'_, AppState>) -> Result<Profile, String> {
    let data_dir = state.data_dir.clone();
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }

    let file = std::fs::File::open(path).map_err(|e| format!("Cannot open file: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid modpack (not a valid zip): {}", e))?;

    // Try to read index file — supports modrinth.index.json (mrpack/kiritpack) and norisk pack.json
    let index_names = ["modrinth.index.json", "pack.json", "norisk.json", "manifest.json"];
    let mut index_str = String::new();
    let mut found = false;
    for name in &index_names {
        match archive.by_name(name) {
            Ok(mut index_file) => {
                std::io::Read::read_to_string(&mut index_file, &mut index_str)
                    .map_err(|e| format!("Failed to read {}: {}", name, e))?;
                log::info!("[Import] Found index file: {}", name);
                found = true;
                break;
            },
            Err(_) => continue,
        }
    }
    if !found {
        return Err("No modrinth.index.json, pack.json, norisk.json, or manifest.json found in the archive".to_string());
    }

    let index: serde_json::Value = serde_json::from_str(&index_str)
        .map_err(|e| format!("Invalid modrinth.index.json: {}", e))?;

    let pack_name = index["name"].as_str().unwrap_or("Imported Pack").to_string();
    let dependencies = &index["dependencies"];

    // Determine MC version and loader
    let mc_version = dependencies["minecraft"].as_str().unwrap_or("1.21.4").to_string();
    let (loader_type, loader_version) = if let Some(v) = dependencies.get("fabric-loader").and_then(|v| v.as_str()) {
        (state::LoaderType::Fabric, Some(v.to_string()))
    } else if let Some(_v) = dependencies.get("forge").and_then(|v| v.as_str()) {
        (state::LoaderType::Forge, None)
    } else if let Some(_v) = dependencies.get("neoforge").and_then(|v| v.as_str()) {
        (state::LoaderType::Neoforge, None)
    } else if let Some(_v) = dependencies.get("quilt-loader").and_then(|v| v.as_str()) {
        (state::LoaderType::Quilt, None)
    } else {
        (state::LoaderType::Vanilla, None)
    };

    // Create a new profile
    let profile_id = uuid::Uuid::new_v4().to_string();
    let new_profile = Profile {
        id: profile_id.clone(),
        name: pack_name,
        icon: "game".to_string(),
        mc_version: mc_version.clone(),
        loader_type,
        loader_version,
        java_path: None,
        memory_mb: 4096,
        jvm_args: String::new(),
        game_args: String::new(),
        resolution_width: 854,
        resolution_height: 480,
        game_dir: String::new(),
        last_played: None,
        total_playtime: 0,
        created: chrono::Utc::now().to_rfc3339(),
    };

    // Save profile
    let mut profiles = state.profiles.lock().await;
    profiles.push(new_profile.clone());
    drop(profiles);
    save_profiles_to_disk(&state).await?;

    let instance_dir = data_dir.join("instances").join(&profile_id);
    tokio::fs::create_dir_all(&instance_dir).await.map_err(|e| e.to_string())?;

    // Parse files and build resources.json
    let mut resources: Vec<InstanceResource> = Vec::new();
    if let Some(files) = index["files"].as_array() {
        for file_entry in files {
            let file_path_str = file_entry["path"].as_str().unwrap_or("");
            let downloads = file_entry["downloads"].as_array();
            let file_url = downloads
                .and_then(|d| d.first())
                .and_then(|u| u.as_str())
                .map(|s| s.to_string());
            let file_name = std::path::Path::new(file_path_str)
                .file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_string());

            // Determine resource type from path
            let resource_type = if file_path_str.starts_with("mods/") {
                "mod"
            } else if file_path_str.starts_with("resourcepacks/") {
                "resourcepack"
            } else if file_path_str.starts_with("shaderpacks/") {
                "shader"
            } else {
                continue; // Skip unknown file types
            };

            // Try to extract slug from Modrinth CDN URL
            let slug = file_url.as_ref()
                .and_then(|u| {
                    // URL format: https://cdn.modrinth.com/data/{project_id}/versions/{version_id}/filename.jar
                    if u.contains("cdn.modrinth.com/data/") {
                        u.split("/data/").nth(1)?.split('/').next().map(|s| s.to_string())
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| file_name.clone().unwrap_or_else(|| "unknown".to_string()));

            let title = file_name.as_ref()
                .map(|n| n.trim_end_matches(".jar").trim_end_matches(".zip").to_string())
                .unwrap_or_else(|| slug.clone());

            resources.push(InstanceResource {
                slug,
                title,
                icon_url: None,
                resource_type: resource_type.to_string(),
                enabled: true,
                version_id: None,
                file_name,
                file_url,
            });
        }
    }

    // Save resources.json
    if !resources.is_empty() {
        let res_data = serde_json::to_string_pretty(&resources).map_err(|e| e.to_string())?;
        tokio::fs::write(instance_dir.join("resources.json"), res_data).await.map_err(|e| e.to_string())?;
    }

    // Extract overrides
    let file = std::fs::File::open(path).map_err(|e| format!("Cannot reopen file: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid zip: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("Zip entry error: {}", e))?;
        let entry_name = entry.name().to_string();

        let relative = if entry_name.starts_with("overrides/") {
            entry_name.strip_prefix("overrides/").unwrap_or("")
        } else if entry_name.starts_with("client-overrides/") {
            entry_name.strip_prefix("client-overrides/").unwrap_or("")
        } else {
            continue;
        };

        if relative.is_empty() || entry.is_dir() {
            let dir_path = instance_dir.join(relative);
            std::fs::create_dir_all(&dir_path).ok();
            continue;
        }

        let out_path = instance_dir.join(relative);
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let mut out_file = std::fs::File::create(&out_path)
            .map_err(|e| format!("Failed to create {}: {}", out_path.display(), e))?;
        std::io::copy(&mut entry, &mut out_file)
            .map_err(|e| format!("Failed to extract {}: {}", relative, e))?;
    }

    log::info!("[Import] Imported .mrpack: {} ({} resources)", new_profile.name, resources.len());
    Ok(new_profile)
}

#[tauri::command]
async fn export_mrpack(profile_id: String, export_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let data_dir = state.data_dir.clone();

    // Get profile
    let profiles = state.profiles.lock().await;
    let profile = profiles.iter().find(|p| p.id == profile_id)
        .ok_or("Profile not found")?.clone();
    drop(profiles);

    let instance_dir = data_dir.join("instances").join(&profile.id);

    // Load resources
    let resources_path = instance_dir.join("resources.json");
    let resources: Vec<InstanceResource> = if resources_path.exists() {
        let data = tokio::fs::read_to_string(&resources_path).await.map_err(|e| e.to_string())?;
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        vec![]
    };

    // Build modrinth.index.json
    let mut dependencies = serde_json::Map::new();
    dependencies.insert("minecraft".to_string(), serde_json::Value::String(profile.mc_version.clone()));
    match profile.loader_type {
        state::LoaderType::Fabric => {
            if let Some(ref v) = profile.loader_version {
                dependencies.insert("fabric-loader".to_string(), serde_json::Value::String(v.clone()));
            }
        },
        state::LoaderType::Forge => { dependencies.insert("forge".to_string(), serde_json::Value::String("latest".to_string())); },
        state::LoaderType::Neoforge => { dependencies.insert("neoforge".to_string(), serde_json::Value::String("latest".to_string())); },
        state::LoaderType::Quilt => { dependencies.insert("quilt-loader".to_string(), serde_json::Value::String("latest".to_string())); },
        _ => {},
    }

    let mut files = Vec::new();
    for resource in &resources {
        if !resource.enabled { continue; }
        if let (Some(file_url), Some(file_name)) = (&resource.file_url, &resource.file_name) {
            let path_prefix = match resource.resource_type.as_str() {
                "mod" => "mods",
                "resourcepack" => "resourcepacks",
                "shader" => "shaderpacks",
                _ => continue,
            };
            files.push(serde_json::json!({
                "path": format!("{}/{}", path_prefix, file_name),
                "downloads": [file_url],
                "hashes": {},
                "fileSize": 0
            }));
        }
    }

    let index = serde_json::json!({
        "formatVersion": 1,
        "game": "minecraft",
        "versionId": "1.0.0",
        "name": profile.name,
        "files": files,
        "dependencies": dependencies
    });

    // Create the .mrpack zip
    let out_file = std::fs::File::create(&export_path)
        .map_err(|e| format!("Cannot create export file: {}", e))?;
    let mut zip_writer = zip::ZipWriter::new(out_file);
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // Write index
    zip_writer.start_file("modrinth.index.json", options)
        .map_err(|e| format!("Zip error: {}", e))?;
    let index_str = serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;
    std::io::Write::write_all(&mut zip_writer, index_str.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;

    // Add overrides for config files etc.
    let override_dirs = ["config", "resourcepacks", "shaderpacks"];
    for dir_name in &override_dirs {
        let dir = instance_dir.join(dir_name);
        if dir.exists() && dir.is_dir() {
            add_dir_to_zip(&mut zip_writer, &dir, &format!("overrides/{}", dir_name), &options)?;
        }
    }

    zip_writer.finish().map_err(|e| format!("Failed to finish zip: {}", e))?;
    log::info!("[Export] Exported .mrpack: {} ({} files)", profile.name, files.len());
    Ok(())
}

fn add_dir_to_zip(
    zip_writer: &mut zip::ZipWriter<std::fs::File>,
    dir: &std::path::Path,
    prefix: &str,
    options: &zip::write::SimpleFileOptions,
) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let zip_path = format!("{}/{}", prefix, name);

        if path.is_dir() {
            add_dir_to_zip(zip_writer, &path, &zip_path, options)?;
        } else {
            zip_writer.start_file(&zip_path, *options).map_err(|e| format!("Zip error: {}", e))?;
            let data = std::fs::read(&path).map_err(|e| format!("Read error: {}", e))?;
            std::io::Write::write_all(zip_writer, &data).map_err(|e| format!("Write error: {}", e))?;
        }
    }
    Ok(())
}

// ---- Helpers ----

fn emit_progress(app: &AppHandle, payload: serde_json::Value) {
    if let Err(e) = app.emit("launch:progress", payload) {
        log::warn!("Failed to emit launch progress: {}", e);
    }
}

async fn save_accounts(state: &AppState) -> Result<(), String> {
    let accounts = state.accounts.lock().await;

    // Store tokens in OS credential manager
    for acc in accounts.iter() {
        let tokens = serde_json::json!({
            "access_token": acc.access_token,
            "refresh_token": acc.refresh_token,
        });
        let key = format!("kiritclient-{}", acc.uuid);
        if let Ok(entry) = keyring::Entry::new("kiritclient", &key) {
            let _ = entry.set_password(&tokens.to_string());
        }
    }

    // Save only non-sensitive data to disk
    let on_disk: Vec<AccountOnDisk> = accounts.iter().map(|a| AccountOnDisk {
        uuid: a.uuid.clone(),
        username: a.username.clone(),
        skin_url: a.skin_url.clone(),
        is_active: a.is_active,
    }).collect();

    let data = serde_json::to_string_pretty(&on_disk)
        .map_err(|e| format!("Serialize error: {}", e))?;
    let path = state.data_dir.join("accounts.json");
    tokio::fs::write(&path, data).await.map_err(|e| format!("Write error: {}", e))
}

async fn save_profiles_to_disk(state: &AppState) -> Result<(), String> {
    let profiles = state.profiles.lock().await;
    manager::save_profiles(&state.data_dir, &profiles).await
}

async fn save_settings_to_disk(state: &AppState) -> Result<(), String> {
    let settings = state.settings.lock().await;
    let data = serde_json::to_string_pretty(&*settings)
        .map_err(|e| format!("Serialize error: {}", e))?;
    let path = state.data_dir.join("settings.json");
    tokio::fs::write(&path, data).await.map_err(|e| format!("Write error: {}", e))
}

async fn load_accounts(data_dir: &std::path::Path) -> Vec<Account> {
    let path = data_dir.join("accounts.json");
    if !path.exists() {
        return vec![];
    }

    let data = match tokio::fs::read_to_string(&path).await {
        Ok(d) => d,
        Err(_) => return vec![],
    };

    // Try new format (without tokens) first
    if let Ok(on_disk) = serde_json::from_str::<Vec<AccountOnDisk>>(&data) {
        return on_disk.into_iter().map(|a| {
            let (access_token, refresh_token) = load_tokens_from_keyring(&a.uuid);
            Account {
                uuid: a.uuid,
                username: a.username,
                skin_url: a.skin_url,
                access_token,
                refresh_token,
                is_active: a.is_active,
            }
        }).collect();
    }

    // Fall back to legacy format (with plaintext tokens) for migration
    if let Ok(accounts) = serde_json::from_str::<Vec<Account>>(&data) {
        return accounts;
    }

    vec![]
}

fn load_tokens_from_keyring(uuid: &str) -> (String, String) {
    let key = format!("kiritclient-{}", uuid);
    if let Ok(entry) = keyring::Entry::new("kiritclient", &key) {
        if let Ok(password) = entry.get_password() {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&password) {
                let access = parsed["access_token"].as_str().unwrap_or("").to_string();
                let refresh = parsed["refresh_token"].as_str().unwrap_or("").to_string();
                return (access, refresh);
            }
        }
    }
    (String::new(), String::new())
}

async fn load_settings(data_dir: &std::path::Path) -> Settings {
    let path = data_dir.join("settings.json");
    if path.exists() {
        if let Ok(data) = tokio::fs::read_to_string(&path).await {
            if let Ok(settings) = serde_json::from_str::<Settings>(&data) {
                return settings;
            }
        }
    }
    Settings::default()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Setup data directory
            let data_dir = dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".kiritclient");
            std::fs::create_dir_all(&data_dir).ok();

            let data_dir_clone = data_dir.clone();

            // Load saved data
            let rt = tokio::runtime::Runtime::new()
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            let accounts = rt.block_on(load_accounts(&data_dir));
            let profiles = rt.block_on(manager::load_profiles(&data_dir));
            let settings = rt.block_on(load_settings(&data_dir));

            let state = AppState {
                accounts: Arc::new(Mutex::new(accounts)),
                profiles: Arc::new(Mutex::new(profiles)),
                settings: Arc::new(Mutex::new(settings)),
                launch_state: Arc::new(Mutex::new(LaunchState::Idle)),
                data_dir: data_dir_clone,
            };

            app.manage(state);

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ms_auth_start,
            ms_auth_poll,
            get_accounts,
            remove_account,
            set_active_account,
            fetch_versions,
            fetch_fabric_versions,
            get_profiles,
            create_profile,
            update_profile,
            delete_profile,
            get_settings,
            update_settings,
            detect_java,
            launch_game,
            get_instance_resources,
            save_instance_resources,
            resolve_modrinth_version,
            import_mrpack,
            export_mrpack,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
