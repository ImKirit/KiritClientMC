use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FabricLoaderVersion {
    pub loader: FabricLoader,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FabricLoader {
    pub separator: String,
    pub build: u32,
    pub maven: String,
    pub version: String,
    pub stable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FabricVersionJson {
    pub id: String,
    #[serde(rename = "mainClass")]
    pub main_class: String,
    pub libraries: Vec<FabricLibrary>,
    pub arguments: Option<FabricArguments>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FabricLibrary {
    pub name: String,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FabricArguments {
    pub jvm: Option<Vec<String>>,
}

pub async fn fetch_fabric_loader_versions(client: &Client, mc_version: &str) -> Result<Vec<FabricLoaderVersion>, String> {
    let url = format!("https://meta.fabricmc.net/v2/versions/loader/{}", mc_version);
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch Fabric versions: {}", e))?;

    resp.json::<Vec<FabricLoaderVersion>>()
        .await
        .map_err(|e| format!("Failed to parse Fabric versions: {}", e))
}

pub async fn fetch_fabric_version_json(client: &Client, mc_version: &str, loader_version: &str) -> Result<FabricVersionJson, String> {
    let url = format!(
        "https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json",
        mc_version, loader_version
    );
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch Fabric version json: {}", e))?;

    resp.json::<FabricVersionJson>()
        .await
        .map_err(|e| format!("Failed to parse Fabric version json: {}", e))
}
