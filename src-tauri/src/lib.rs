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

    let settings = state.settings.lock().await.clone();

    // Emit progress
    let _ = app.emit("launch:progress", serde_json::json!({
        "stage": "versions",
        "message": "Fetching version info...",
        "progress": 0.0
    }));

    // Fetch version manifest and version JSON
    let manifest = versions::fetch_version_manifest(&client).await?;
    let version_entry = manifest.versions.iter()
        .find(|v| v.id == profile.mc_version)
        .ok_or(format!("Version {} not found", profile.mc_version))?;

    let version_json = versions::fetch_version_json(&client, &version_entry.url).await?;

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
    let _ = app.emit("launch:progress", serde_json::json!({
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
    let _ = app.emit("launch:progress", serde_json::json!({
        "stage": "libraries",
        "message": "Downloading libraries...",
        "progress": 0.3
    }));

    let lib_tasks = libraries::collect_library_tasks(&version_json, &libraries_dir);
    let app_clone = app.clone();
    download::download_batch(&client, lib_tasks, settings.download_threads as usize, move |done, total, _url| {
        let _ = app_clone.emit("launch:progress", serde_json::json!({
            "stage": "libraries",
            "message": format!("Libraries: {}/{}", done, total),
            "progress": 0.3 + (done as f64 / total as f64) * 0.2
        }));
    }).await?;

    // Download assets
    let _ = app.emit("launch:progress", serde_json::json!({
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
        let _ = app_clone.emit("launch:progress", serde_json::json!({
            "stage": "assets",
            "message": format!("Assets: {}/{}", done, total),
            "progress": 0.5 + (done as f64 / total as f64) * 0.3
        }));
    }).await?;

    // Find Java
    let _ = app.emit("launch:progress", serde_json::json!({
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
    let _ = app.emit("launch:progress", serde_json::json!({
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

    let _ = app.emit("launch:progress", serde_json::json!({
        "stage": "running",
        "message": "Minecraft is running!",
        "progress": 1.0,
        "pid": pid
    }));

    Ok(())
}

// ---- Helpers ----

async fn save_accounts(state: &AppState) -> Result<(), String> {
    let accounts = state.accounts.lock().await;
    let data = serde_json::to_string_pretty(&*accounts)
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
    if path.exists() {
        if let Ok(data) = tokio::fs::read_to_string(&path).await {
            if let Ok(accounts) = serde_json::from_str::<Vec<Account>>(&data) {
                return accounts;
            }
        }
    }
    vec![]
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
        .setup(|app| {
            // Setup data directory
            let data_dir = dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".kiritclient");
            std::fs::create_dir_all(&data_dir).ok();

            let data_dir_clone = data_dir.clone();

            // Load saved data
            let rt = tokio::runtime::Runtime::new().unwrap();
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

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
