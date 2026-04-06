use serde::{Deserialize, Serialize};
use reqwest::Client;

// Azure AD client ID for Minecraft authentication (device code flow)
const CLIENT_ID: &str = "c36a9fb6-4f2a-41ff-90bd-ae7cc92031eb";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub device_code: String,
    #[serde(alias = "verification_url")]
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
    pub message: Option<String>,
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
    pub xuid: String,
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
            ("scope", "XboxLive.signin XboxLive.offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;

    let status = resp.status();
    let text = resp.text().await
        .map_err(|e| format!("Failed to read device code response: {}", e))?;

    log::info!("[Auth] Device code response (HTTP {}): {}", status.as_u16(), &text[..text.len().min(500)]);

    if !status.is_success() {
        return Err(format!("Microsoft returned HTTP {}: {}", status.as_u16(), text));
    }

    serde_json::from_str::<DeviceCodeResponse>(&text)
        .map_err(|e| format!("Failed to parse device code response: {} — Body: {}", e, &text[..text.len().min(500)]))
}

pub async fn poll_for_token(client: &Client, device_code: &str) -> Result<Option<MsTokenResponse>, String> {
    log::info!("[Auth] Polling for token (device_code={}...)", &device_code[..device_code.len().min(8)]);

    let resp = client
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("client_id", CLIENT_ID),
            ("device_code", device_code),
        ])
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("Failed to poll for token: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    log::info!("[Auth] Poll response HTTP {}: {}", status.as_u16(), &text[..text.len().min(200)]);

    if status.is_success() {
        log::info!("[Auth] Token received! Starting full auth chain...");
        let token: MsTokenResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse token: {}", e))?;
        Ok(Some(token))
    } else {
        let err: PollError = serde_json::from_str(&text).unwrap_or(PollError {
            error: "unknown".to_string(),
            error_description: None,
        });
        if err.error == "authorization_pending" || err.error == "slow_down" {
            log::debug!("[Auth] Still waiting...");
            Ok(None) // Still waiting
        } else if err.error == "expired_token" {
            Err("Login expired. Please try again.".to_string())
        } else {
            log::warn!("[Auth] Poll error: {} - {:?}", err.error, err.error_description);
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
            ("scope", "XboxLive.signin XboxLive.offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to refresh token: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read refresh response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Token refresh failed (HTTP {}): {}", status.as_u16(), text));
    }

    serde_json::from_str::<MsTokenResponse>(&text)
        .map_err(|e| format!("Failed to parse refresh response: {} — Body: {}", e, text))
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
        .timeout(std::time::Duration::from_secs(30))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Xbox Live auth failed: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read Xbox Live response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Xbox Live auth failed (HTTP {}): {}", status.as_u16(), text));
    }

    serde_json::from_str::<XboxLiveResponse>(&text)
        .map_err(|e| format!("Failed to parse Xbox Live response: {} — Body: {}", e, text))
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
        .timeout(std::time::Duration::from_secs(30))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("XSTS auth failed: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read XSTS response: {}", e))?;

    if !status.is_success() {
        // Parse XSTS-specific error codes
        if let Ok(err) = serde_json::from_str::<serde_json::Value>(&text) {
            if let Some(xerr) = err.get("XErr").and_then(|v| v.as_u64()) {
                let msg = match xerr {
                    2148916233 => "This Microsoft account has no Xbox account. Please create one at xbox.com first.",
                    2148916235 => "Xbox Live is not available in your country/region.",
                    2148916236 | 2148916237 => "Adult verification needed. Please sign in at xbox.com.",
                    2148916238 => "This is a child account. A parent must add this account to a Microsoft family.",
                    _ => "Unknown Xbox error.",
                };
                return Err(format!("XSTS error ({}): {}", xerr, msg));
            }
        }
        return Err(format!("XSTS auth failed (HTTP {}): {}", status.as_u16(), text));
    }

    serde_json::from_str::<XboxLiveResponse>(&text)
        .map_err(|e| format!("Failed to parse XSTS response: {} — Body: {}", e, text))
}

pub async fn mc_login(client: &Client, userhash: &str, xsts_token: &str) -> Result<McAuthResponse, String> {
    let body = serde_json::json!({
        "identityToken": format!("XBL3.0 x={};{}", userhash, xsts_token)
    });

    let resp = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(30))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("MC login failed: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read MC login response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Minecraft login failed (HTTP {}): {}", status.as_u16(), text));
    }

    serde_json::from_str::<McAuthResponse>(&text)
        .map_err(|e| format!("Failed to parse MC login response: {} — Body: {}", e, text))
}

pub async fn get_mc_profile(client: &Client, mc_token: &str) -> Result<McProfile, String> {
    let resp = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .header("Authorization", format!("Bearer {}", mc_token))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to get MC profile: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Failed to read MC profile response: {}", e))?;

    if !status.is_success() {
        if status.as_u16() == 404 {
            return Err("This Microsoft account does not own Minecraft. Please purchase the game first.".to_string());
        }
        return Err(format!("Failed to get MC profile (HTTP {}): {}", status.as_u16(), text));
    }

    serde_json::from_str::<McProfile>(&text)
        .map_err(|e| format!("Failed to parse MC profile: {} — Body: {}", e, text))
}

pub async fn full_auth_chain(client: &Client, ms_token: &str, refresh_token: &str) -> Result<AuthResult, String> {
    // Step 1: Xbox Live
    log::info!("[Auth] Step 1/4: Xbox Live authentication...");
    let xbox = xbox_live_auth(client, ms_token).await?;
    let userhash = xbox.display_claims.xui.first()
        .ok_or("No Xbox user hash found")?
        .uhs.clone();
    let xbox_token = xbox.token;
    log::info!("[Auth] Step 1/4: Xbox Live OK (uhs={}...)", &userhash[..userhash.len().min(4)]);

    // Step 2: XSTS
    log::info!("[Auth] Step 2/4: XSTS authorization...");
    let xsts = xsts_auth(client, &xbox_token).await?;
    let xsts_token = xsts.token;
    log::info!("[Auth] Step 2/4: XSTS OK");

    // Step 3: MC Login
    log::info!("[Auth] Step 3/4: Minecraft login...");
    let mc_auth = mc_login(client, &userhash, &xsts_token).await?;
    log::info!("[Auth] Step 3/4: Minecraft login OK");

    // Step 4: MC Profile
    log::info!("[Auth] Step 4/4: Fetching Minecraft profile...");
    let profile = get_mc_profile(client, &mc_auth.access_token).await?;
    let skin_url = profile.skins.as_ref()
        .and_then(|s| s.first())
        .map(|s| s.url.clone());
    log::info!("[Auth] Step 4/4: Profile OK — {} ({})", profile.name, profile.id);

    Ok(AuthResult {
        uuid: profile.id,
        username: profile.name,
        skin_url,
        access_token: mc_auth.access_token,
        refresh_token: refresh_token.to_string(),
        xuid: userhash,
    })
}
