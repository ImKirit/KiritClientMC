use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub uuid: String,
    pub username: String,
    pub skin_url: Option<String>,
    pub access_token: String,
    pub refresh_token: String,
    #[serde(default)]
    pub xuid: String,
    pub is_active: bool,
}

/// On-disk representation without sensitive tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountOnDisk {
    pub uuid: String,
    pub username: String,
    pub skin_url: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub mc_version: String,
    pub loader_type: LoaderType,
    pub loader_version: Option<String>,
    pub java_path: Option<String>,
    pub memory_mb: u32,
    pub jvm_args: String,
    pub game_args: String,
    pub resolution_width: u32,
    pub resolution_height: u32,
    pub game_dir: String,
    pub last_played: Option<String>,
    pub total_playtime: u64,
    pub created: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LoaderType {
    Vanilla,
    Fabric,
    Forge,
    Neoforge,
    Quilt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceResource {
    pub slug: String,
    pub title: String,
    pub icon_url: Option<String>,
    pub resource_type: String, // "mod", "resourcepack", "shader"
    pub enabled: bool,
    pub version_id: Option<String>,   // Modrinth version ID
    pub file_name: Option<String>,    // Downloaded file name
    pub file_url: Option<String>,     // Download URL
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardPackage {
    pub title: String,
    pub resource_type: String, // "mod", "resourcepack", "shader"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub default_memory_mb: u32,
    pub download_threads: u32,
    pub close_on_launch: bool,
    pub show_console: bool,
    pub java_paths: Vec<JavaInstallation>,
    #[serde(default = "default_standard_packages")]
    pub standard_packages: Vec<StandardPackage>,
}

fn default_standard_packages() -> Vec<StandardPackage> {
    vec![
        // Mods
        StandardPackage { title: "Essential".into(), resource_type: "mod".into() },
        StandardPackage { title: "Mouse Tweaks".into(), resource_type: "mod".into() },
        StandardPackage { title: "Zoomify".into(), resource_type: "mod".into() },
        StandardPackage { title: "Sodium".into(), resource_type: "mod".into() },
        StandardPackage { title: "Iris Shaders".into(), resource_type: "mod".into() },
        StandardPackage { title: "Gamma Utils".into(), resource_type: "mod".into() },
        StandardPackage { title: "Simple Voice Chat".into(), resource_type: "mod".into() },
        StandardPackage { title: "Mod Menu".into(), resource_type: "mod".into() },
        StandardPackage { title: "Spark".into(), resource_type: "mod".into() },
        StandardPackage { title: "Distant Horizons".into(), resource_type: "mod".into() },
        StandardPackage { title: "Better Hurtcam".into(), resource_type: "mod".into() },
        StandardPackage { title: "Bundles Beyond".into(), resource_type: "mod".into() },
        StandardPackage { title: "ShulkerBoxTooltip".into(), resource_type: "mod".into() },
        StandardPackage { title: "Jade".into(), resource_type: "mod".into() },
        StandardPackage { title: "Armor HUD".into(), resource_type: "mod".into() },
        StandardPackage { title: "NoFog".into(), resource_type: "mod".into() },
        StandardPackage { title: "Sound Controller".into(), resource_type: "mod".into() },
        StandardPackage { title: "Tier Tagger".into(), resource_type: "mod".into() },
        StandardPackage { title: "Who am I".into(), resource_type: "mod".into() },
        StandardPackage { title: "WorldEdit".into(), resource_type: "mod".into() },
        StandardPackage { title: "Bactromod".into(), resource_type: "mod".into() },
        StandardPackage { title: "AutoReconnect".into(), resource_type: "mod".into() },
        // Texture Packs
        StandardPackage { title: "No Vault Sides".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Railguns Redstone Pack".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Re:Covered".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Red Powder Snow".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Rubiks Anti-Rotation".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Small Totems".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Small Totem Pop".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Theones Eating Animation".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "No Particles".into(), resource_type: "resourcepack".into() },
        StandardPackage { title: "Transparent Inventorys".into(), resource_type: "resourcepack".into() },
        // Shader Packs
        StandardPackage { title: "Bliss Shader".into(), resource_type: "shader".into() },
        StandardPackage { title: "BSL Shaders".into(), resource_type: "shader".into() },
        StandardPackage { title: "Complementary Shaders".into(), resource_type: "shader".into() },
        StandardPackage { title: "Complementary Reimagined".into(), resource_type: "shader".into() },
        StandardPackage { title: "Photon Shader".into(), resource_type: "shader".into() },
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaInstallation {
    pub path: String,
    pub version: String,
    pub is_auto: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            default_memory_mb: 4096,
            download_threads: 8,
            close_on_launch: false,
            show_console: false,
            java_paths: vec![],
            standard_packages: default_standard_packages(),
        }
    }
}

impl Default for Profile {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Default".to_string(),
            icon: "sword".to_string(),
            mc_version: "1.21.4".to_string(),
            loader_type: LoaderType::Vanilla,
            loader_version: None,
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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LaunchState {
    Idle,
    Downloading { progress: f64, message: String },
    Launching,
    Running { pid: u32 },
    Crashed { message: String },
}

pub struct AppState {
    pub accounts: Arc<Mutex<Vec<Account>>>,
    pub profiles: Arc<Mutex<Vec<Profile>>>,
    pub settings: Arc<Mutex<Settings>>,
    pub launch_state: Arc<Mutex<LaunchState>>,
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            accounts: Arc::new(Mutex::new(vec![])),
            profiles: Arc::new(Mutex::new(vec![])),
            settings: Arc::new(Mutex::new(Settings::default())),
            launch_state: Arc::new(Mutex::new(LaunchState::Idle)),
            data_dir,
        }
    }
}
