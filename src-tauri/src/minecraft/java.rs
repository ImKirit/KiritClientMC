use std::path::{Path, PathBuf};
use std::process::Command;

pub fn detect_java_installations() -> Vec<(String, String)> {
    let mut installations = Vec::new();

    // Check JAVA_HOME
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let java_exe = PathBuf::from(&java_home).join("bin").join("java.exe");
        if java_exe.exists() {
            if let Some(version) = get_java_version(&java_exe) {
                installations.push((java_exe.to_string_lossy().to_string(), version));
            }
        }
    }

    // Check common Windows paths
    let program_files = vec![
        std::env::var("ProgramFiles").unwrap_or_default(),
        std::env::var("ProgramFiles(x86)").unwrap_or_default(),
        format!("{}\\AppData\\Local\\Programs", std::env::var("USERPROFILE").unwrap_or_default()),
    ];

    let java_dirs = vec![
        "Java", "Eclipse Adoptium", "AdoptOpenJDK", "Zulu", "BellSoft",
        "Microsoft", "Amazon Corretto",
    ];

    for pf in &program_files {
        if pf.is_empty() { continue; }
        for jdir in &java_dirs {
            let base = PathBuf::from(pf).join(jdir);
            if base.exists() {
                if let Ok(entries) = std::fs::read_dir(&base) {
                    for entry in entries.flatten() {
                        let java_exe = entry.path().join("bin").join("java.exe");
                        if java_exe.exists() {
                            if let Some(version) = get_java_version(&java_exe) {
                                let path_str = java_exe.to_string_lossy().to_string();
                                if !installations.iter().any(|(p, _)| p == &path_str) {
                                    installations.push((path_str, version));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Check PATH
    if let Ok(output) = Command::new("where").arg("java").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let path = line.trim().to_string();
                if !installations.iter().any(|(p, _)| p == &path) {
                    if let Some(version) = get_java_version(Path::new(&path)) {
                        installations.push((path, version));
                    }
                }
            }
        }
    }

    installations
}

pub fn get_java_version(java_path: &Path) -> Option<String> {
    let output = Command::new(java_path)
        .arg("-version")
        .output()
        .ok()?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    // Parse version from: java version "1.8.0_xxx" or openjdk version "21.0.x"
    for line in stderr.lines() {
        if line.contains("version") {
            if let Some(start) = line.find('"') {
                if let Some(end) = line[start+1..].find('"') {
                    return Some(line[start+1..start+1+end].to_string());
                }
            }
        }
    }
    None
}

pub fn get_required_java_major(mc_version: &str) -> u32 {
    // Parse MC version to determine Java requirement
    let parts: Vec<&str> = mc_version.split('.').collect();
    if parts.len() >= 2 {
        if let Ok(minor) = parts[1].parse::<u32>() {
            return match minor {
                0..=16 => 8,
                17 => 16,
                18..=20 => {
                    if parts.len() >= 3 {
                        if let Ok(patch) = parts[2].parse::<u32>() {
                            if minor == 20 && patch >= 5 { return 21; }
                        }
                    }
                    17
                },
                _ => 21,
            };
        }
    }
    21 // Default to latest
}

pub fn find_java_for_version(mc_version: &str, installations: &[(String, String)]) -> Option<String> {
    let required = get_required_java_major(mc_version);

    for (path, version) in installations {
        let major = parse_java_major(version);
        if major >= required {
            return Some(path.clone());
        }
    }

    None
}

fn parse_java_major(version: &str) -> u32 {
    if version.starts_with("1.") {
        // Old format: 1.8.0_xxx -> 8
        version.split('.').nth(1).and_then(|s| s.parse().ok()).unwrap_or(0)
    } else {
        // New format: 21.0.x -> 21
        version.split('.').next().and_then(|s| s.parse().ok()).unwrap_or(0)
    }
}
