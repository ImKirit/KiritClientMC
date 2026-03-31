# KiritClient

Custom Minecraft Launcher built with Tauri 2 + React + TypeScript.

Norisk-style black/white glass UI with custom capes, profiles, and multi-account support.

## Features
- Microsoft OAuth2 login (multi-account)
- Profile system with Vanilla, Fabric, Forge, NeoForge, Quilt
- Parallel download manager with SHA1 verification
- Custom capes & creator codes (coming soon)
- Game launching with automatic Java detection

## Tech Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion
- **Backend:** Rust (Tauri 2), reqwest, tokio, serde
- **Build:** Vite, cargo-tauri

## Development
```bash
npm install
cargo tauri dev
```

## Build
```bash
cargo tauri build
```
