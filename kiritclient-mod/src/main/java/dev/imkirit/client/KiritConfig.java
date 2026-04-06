package dev.imkirit.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Set;

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

    // Cape API
    public String capeApiUrl = "https://imkirit.dev/kc-api";

    // ESP
    public boolean espEnabled = false;
    public boolean entityEspEnabled = true;
    public boolean blockEspEnabled = true;
    public boolean itemEspEnabled = true;
    public boolean storageEspEnabled = true;
    public boolean tracerEnabled = false;
    public int espScanRange = 32;
    public int espBlockRefreshTicks = 10;
    public Set<String> espSelectedBlocks = new LinkedHashSet<>(Set.of(
            "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
            "minecraft:chest", "minecraft:spawner", "minecraft:ancient_debris"
    ));
    public Set<String> espSelectedEntities = new LinkedHashSet<>(Set.of(
            "minecraft:player", "minecraft:zombie", "minecraft:creeper",
            "minecraft:skeleton", "minecraft:enderman", "minecraft:item"
    ));

    // Fullbright
    public boolean fullbrightEnabled = false;

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
