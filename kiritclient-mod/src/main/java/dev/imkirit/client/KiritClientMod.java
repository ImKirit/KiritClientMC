package dev.imkirit.client;

import dev.imkirit.client.cape.CapeManager;
import dev.imkirit.client.feature.FriendsManager;
import dev.imkirit.client.feature.HitboxRenderer;
import dev.imkirit.client.feature.WaypointManager;
import dev.imkirit.client.gui.KiritSettingsScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class KiritClientMod implements ClientModInitializer {

    public static final String MOD_ID = "kiritclient";
    public static final Logger LOGGER = LoggerFactory.getLogger("KiritClient");

    private static KiritClientMod instance;

    private KiritConfig config;
    private CapeManager capeManager;
    private HitboxRenderer hitboxRenderer;
    private WaypointManager waypointManager;
    private FriendsManager friendsManager;

    private KeyBinding settingsKey;
    private KeyBinding waypointKey;
    private KeyBinding toggleHitboxKey;

    public static KiritClientMod getInstance() {
        return instance;
    }

    @Override
    public void onInitializeClient() {
        instance = this;
        LOGGER.info("[KiritClient] Initializing...");

        // Load config
        config = KiritConfig.load();

        // Initialize systems
        capeManager = new CapeManager();
        hitboxRenderer = new HitboxRenderer();
        waypointManager = new WaypointManager();
        friendsManager = new FriendsManager();

        // Register keybinds
        settingsKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.settings",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_RIGHT_SHIFT,
                "category.kiritclient"
        ));

        waypointKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.waypoint",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_B,
                "category.kiritclient"
        ));

        toggleHitboxKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.hitbox",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_H,
                "category.kiritclient"
        ));

        // Tick event for keybinds
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            if (settingsKey.wasPressed()) {
                client.setScreen(new KiritSettingsScreen(null));
            }
            if (waypointKey.wasPressed() && config.waypointsEnabled) {
                waypointManager.addWaypointAtPlayer(client);
            }
            if (toggleHitboxKey.wasPressed()) {
                config.hitboxesEnabled = !config.hitboxesEnabled;
                config.save();
                LOGGER.info("[KiritClient] Hitboxes: {}", config.hitboxesEnabled ? "ON" : "OFF");
            }
        });

        LOGGER.info("[KiritClient] Loaded! Press RIGHT_SHIFT for settings.");
    }

    public KiritConfig getConfig() { return config; }
    public CapeManager getCapeManager() { return capeManager; }
    public HitboxRenderer getHitboxRenderer() { return hitboxRenderer; }
    public WaypointManager getWaypointManager() { return waypointManager; }
    public FriendsManager getFriendsManager() { return friendsManager; }
}
