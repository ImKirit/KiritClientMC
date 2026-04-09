package dev.imkirit.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
public class KiritConfig {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    // Feature toggles
    public boolean capesEnabled = true;
    public boolean hitboxesEnabled = false;
    public boolean waypointsEnabled = true;
    public boolean friendsEnabled = true;
    public boolean cosmeticsEnabled = true;

    // Hitbox settings
    public boolean hitboxShowHealth = true;
    public float hitboxRed = 1.0f;
    public float hitboxGreen = 1.0f;
    public float hitboxBlue = 1.0f;
    public float hitboxAlpha = 0.4f;

    // Waypoint settings
    public boolean waypointBeam = true;
    public boolean waypointDistance = true;
    public int waypointRenderDistance = 500;
    public boolean waypointDeathAutoset = false;

    // Cape API
    public String capeApiUrl = "https://imkirit.dev/kc-api";

    // Fullbright
    public boolean fullbrightEnabled = false;

    // Zoom
    public boolean zoomEnabled = true;
    public int zoomFov = 15;

    // Coordinates HUD
    public boolean coordsHudEnabled = false;

    // Macros (key → command)
    public boolean macrosEnabled = true;
    public java.util.List<MacroEntry> macros = new java.util.ArrayList<>();

    public static class MacroEntry {
        public String name = "";
        public String command = "";
        public int keyCode = -1; // GLFW key code

        public MacroEntry() {}
        public MacroEntry(String name, String command, int keyCode) {
            this.name = name;
            this.command = command;
            this.keyCode = keyCode;
        }
    }

    // Custom Crosshair
    public boolean customCrosshairEnabled = false;
    public String crosshairType = "plus"; // plus, dot, circle
    public int crosshairSize = 6;
    public int crosshairThickness = 2;
    public int crosshairGap = 3;
    public float crosshairRed = 1.0f;
    public float crosshairGreen = 1.0f;
    public float crosshairBlue = 1.0f;
    public float crosshairAlpha = 1.0f;

    private static Path getConfigPath() {
        return FabricLoader.getInstance().getConfigDir().resolve("kiritclient.json");
    }

    public static KiritConfig load() {
        Path path = getConfigPath();
        if (Files.exists(path)) {
            try {
                String json = Files.readString(path);
                KiritConfig config = GSON.fromJson(json, KiritConfig.class);
                if (config != null) {
                    KiritClientMod.LOGGER.info("[KiritClient] Config loaded from {}", path);
                    return config;
                }
            } catch (Exception e) {
                KiritClientMod.LOGGER.warn("[KiritClient] Failed to load config, using defaults: {}", e.getMessage());
            }
        }
        KiritConfig config = new KiritConfig();
        config.save();
        return config;
    }

    public void save() {
        try {
            Path path = getConfigPath();
            Files.createDirectories(path.getParent());
            Files.writeString(path, GSON.toJson(this));
        } catch (IOException e) {
            KiritClientMod.LOGGER.error("[KiritClient] Failed to save config: {}", e.getMessage());
        }
    }
}
