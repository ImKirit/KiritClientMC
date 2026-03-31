use serde::{Deserialize, Serialize};
use reqwest::Client;

const CLIENT_ID: &str = "00000000-0000-0000-0000-000000000000"; // Replace with Azure AD app client ID

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub device_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MsTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_type: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XboxLiveResponse {
    #[serde(rename = "Token")]
    pub token: String,
    #[serde(rename = "DisplayClaims")]
    pub display_claims: DisplayClaims,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayClaims {
    pub xui: Vec<XuiClaim>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XuiClaim {
    pub uhs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McAuthResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McProfile {
    pub id: String,
    pub name: String,
    pub skins: Option<Vec<McSkin>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McSkin {
    pub url: String,
    pub variant: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub uuid: String,
    pub username: String,
    pub skin_url: Option<String>,
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PollError {
    pub error: String,
    pub error_description: Option<String>,
}

pub async fn request_device_code(client: &Client) -> Result<DeviceCodeResponse, String> {
    let resp = client
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode")
        .form(&[
            ("client_id", CLIENT_ID),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;

    resp.json::<DeviceCodeResponse>()
        .await
        .map_err(|e| format!("Failed to parse device code response: {}", e))
}

pub async fn poll_for_token(client: &Client, device_code: &str) -> Result<Option<MsTokenResponse>, String> {
    let resp = client
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("client_id", CLIENT_ID),
            ("device_code", device_code),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to poll for token: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if status.is_success() {
        let token: MsTokenResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse token: {}", e))?;
        Ok(Some(token))
    } else {
        let err: PollError = serde_json::from_str(&text).unwrap_or(PollError {
            error: "unknown".to_string(),
            error_description: None,
        });
        if err.error == "authorization_pending" {
            Ok(None) // Still waiting
        } else {
            Err(format!("Auth error: {} - {:?}", err.error, err.error_description))
        }
    }
}

pub async fn refresh_ms_token(client: &Client, refresh_token: &str) -> Result<MsTokenResponse, String> {
    let resp = client
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("client_id", CLIENT_ID),
            ("refresh_token", refresh_token),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to refresh token: {}", e))?;

    resp.json::<MsTokenResponse>()
        .await
        .map_err(|e| format!("Failed to parse refresh response: {}", e))
}

pub async fn xbox_live_auth(client: &Client, ms_token: &str) -> Result<XboxLiveResponse, String> {
    let body = serde_json::json!({
        "Properties": {
            "AuthMethod": "RPS",
            "SiteName": "user.auth.xboxlive.com",
            "RpsTicket": format!("d={}", ms_token)
        },
        "RelyingParty": "http://auth.xboxlive.com",
        "TokenType": "JWT"
    });

    let resp = client
        .post("https://user.auth.xboxlive.com/user/authenticate")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Xbox Live auth failed: {}", e))?;

    resp.json::<XboxLiveResponse>()
        .await
        .map_err(|e| format!("Failed to parse Xbox Live response: {}", e))
}

pub async fn xsts_auth(client: &Client, xbox_token: &str) -> Result<XboxLiveResponse, String> {
    let body = serde_json::json!({
        "Properties": {
            "SandboxId": "RETAIL",
            "UserTokens": [xbox_token]
        },
        "RelyingParty": "rp://api.minecraftservices.com/",
        "TokenType": "JWT"
    });

    let resp = client
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("XSTS auth failed: {}", e))?;

    resp.json::<XboxLiveResponse>()
        .await
        .map_err(|e| format!("Failed to parse XSTS response: {}", e))
}

pub async fn mc_login(client: &Client, userhash: &str, xsts_token: &str) -> Result<McAuthResponse, String> {
    let body = serde_json::json!({
        "identityToken": format!("XBL3.0 x={};{}", userhash, xsts_token)
    });

    let resp = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("MC login failed: {}", e))?;

    resp.json::<McAuthResponse>()
        .await
        .map_err(|e| format!("Failed to parse MC login response: {}", e))
}

pub async fn get_mc_profile(client: &Client, mc_token: &str) -> Result<McProfile, String> {
    let resp = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .header("Authorization", format!("Bearer {}", mc_token))
        .send()
        .await
        .map_err(|e| format!("Failed to get MC profile: {}", e))?;

    resp.json::<McProfile>()
        .await
        .map_err(|e| format!("Failed to parse MC profile: {}", e))
}

pub async fn full_auth_chain(client: &Client, ms_token: &str, refresh_token: &str) -> Result<AuthResult, String> {
    // Step 1: Xbox Live
    let xbox = xbox_live_auth(client, ms_token).await?;
    let userhash = xbox.display_claims.xui.first()
        .ok_or("No Xbox user hash found")?
        .uhs.clone();
    let xbox_token = xbox.token;

    // Step 2: XSTS
    let xsts = xsts_auth(client, &xbox_token).await?;
    let xsts_token = xsts.token;

    // Step 3: MC Login
    let mc_auth = mc_login(client, &userhash, &xsts_token).await?;

    // Step 4: MC Profile
    let profile = get_mc_profile(client, &mc_auth.access_token).await?;
    let skin_url = profile.skins.as_ref()
        .and_then(|s| s.first())
        .map(|s| s.url.clone());

    Ok(AuthResult {
        uuid: profile.id,
        username: profile.name,
        skin_url,
        access_token: mc_auth.access_token,
        refresh_token: refresh_token.to_string(),
    })
}
