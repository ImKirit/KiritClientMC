use std::path::Path;
use crate::state::Profile;

pub async fn load_profiles(data_dir: &Path) -> Vec<Profile> {
    let path = data_dir.join("profiles.json");
    if path.exists() {
        if let Ok(data) = tokio::fs::read_to_string(&path).await {
            if let Ok(profiles) = serde_json::from_str::<Vec<Profile>>(&data) {
                return profiles;
            }
        }
    }
    vec![Profile::default()]
}

pub async fn save_profiles(data_dir: &Path, profiles: &[Profile]) -> Result<(), String> {
    let path = data_dir.join("profiles.json");
    let data = serde_json::to_string_pretty(profiles)
        .map_err(|e| format!("Failed to serialize profiles: {}", e))?;
    tokio::fs::write(&path, data)
        .await
        .map_err(|e| format!("Failed to write profiles: {}", e))
}
