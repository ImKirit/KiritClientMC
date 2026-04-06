package dev.imkirit.client;

import dev.imkirit.client.cape.CapeManager;
import dev.imkirit.client.feature.*;
import dev.imkirit.client.gui.KiritSettingsScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
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
    private EspManager espManager;
    private FullbrightManager fullbrightManager;

    private KeyBinding settingsKey;
    private KeyBinding waypointKey;
    private KeyBinding toggleHitboxKey;
    private KeyBinding toggleEspKey;
    private KeyBinding toggleFullbrightKey;

    public static KiritClientMod getInstance() {
        return instance;
    }

    @Override
    public void onInitializeClient() {
        instance = this;
        LOGGER.info("[KiritClient] Initializing...");

        config = KiritConfig.load();

        try { capeManager = new CapeManager(); }
        catch (Throwable e) { LOGGER.warn("[KiritClient] CapeManager failed: {}", e.getMessage()); }

        try { hitboxRenderer = new HitboxRenderer(); }
        catch (Throwable e) { LOGGER.warn("[KiritClient] HitboxRenderer failed: {}", e.getMessage()); }

        try { waypointManager = new WaypointManager(); }
        catch (Throwable e) { LOGGER.warn("[KiritClient] WaypointManager failed: {}", e.getMessage()); }

        try { friendsManager = new FriendsManager(); }
        catch (Throwable e) { LOGGER.warn("[KiritClient] FriendsManager failed: {}", e.getMessage()); }

        try { espManager = new EspManager(); }
        catch (Throwable e) { LOGGER.warn("[KiritClient] EspManager failed: {}", e.getMessage()); }

        try { fullbrightManager = new FullbrightManager(); }
        catch (Throwable e) { LOGGER.warn("[KiritClient] FullbrightManager failed: {}", e.getMessage()); }

        // Keybinds
        settingsKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.settings", GLFW.GLFW_KEY_RIGHT_SHIFT, KeyBinding.Category.MISC));

        waypointKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.waypoint", GLFW.GLFW_KEY_B, KeyBinding.Category.MISC));

        toggleHitboxKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.hitbox", GLFW.GLFW_KEY_H, KeyBinding.Category.MISC));

        toggleEspKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.esp", GLFW.GLFW_KEY_J, KeyBinding.Category.MISC));

        toggleFullbrightKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.kiritclient.fullbright", GLFW.GLFW_KEY_K, KeyBinding.Category.MISC));

        // Tick handler
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            if (settingsKey.wasPressed()) {
                client.setScreen(new KiritSettingsScreen(null));
            }
            if (waypointKey.wasPressed() && config.waypointsEnabled && waypointManager != null) {
                waypointManager.addWaypointAtPlayer(client);
            }
            if (toggleHitboxKey.wasPressed()) {
                config.hitboxesEnabled = !config.hitboxesEnabled;
                config.save();
                LOGGER.info("[KiritClient] Hitboxes: {}", config.hitboxesEnabled ? "ON" : "OFF");
            }
            if (toggleEspKey.wasPressed()) {
                config.espEnabled = !config.espEnabled;
                config.save();
                LOGGER.info("[KiritClient] ESP: {}", config.espEnabled ? "ON" : "OFF");
            }
            if (toggleFullbrightKey.wasPressed()) {
                config.fullbrightEnabled = !config.fullbrightEnabled;
                config.save();
                LOGGER.info("[KiritClient] Fullbright: {}", config.fullbrightEnabled ? "ON" : "OFF");
            }

            // Tick features
            if (espManager != null) espManager.tick(client);
            if (fullbrightManager != null) fullbrightManager.tick(client);
        });

        LOGGER.info("[KiritClient] Loaded! RIGHT_SHIFT=Settings, J=ESP, K=Fullbright");
    }

    public KiritConfig getConfig() { return config; }
    public CapeManager getCapeManager() { return capeManager; }
    public HitboxRenderer getHitboxRenderer() { return hitboxRenderer; }
    public WaypointManager getWaypointManager() { return waypointManager; }
    public FriendsManager getFriendsManager() { return friendsManager; }
    public EspManager getEspManager() { return espManager; }
    public FullbrightManager getFullbrightManager() { return fullbrightManager; }
}
