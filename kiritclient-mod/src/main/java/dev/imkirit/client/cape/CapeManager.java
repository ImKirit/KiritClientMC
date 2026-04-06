package dev.imkirit.client.cape;

import dev.imkirit.client.KiritClientMod;
import net.minecraft.util.Identifier;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages cape textures for KiritClient users.
 * Cape rendering will be implemented once the backend API is ready.
 */
public class CapeManager {

    private final Map<UUID, Identifier> capeTextures = new ConcurrentHashMap<>();
    private final Set<UUID> fetchedPlayers = ConcurrentHashMap.newKeySet();

    public CapeManager() {
        KiritClientMod.LOGGER.info("[KiritClient] CapeManager initialized");
    }

    public Identifier getCapeTexture(UUID playerUuid) {
        if (!KiritClientMod.getInstance().getConfig().capesEnabled) return null;
        return capeTextures.get(playerUuid);
    }

    public void onPlayerLeave(UUID playerUuid) {
        capeTextures.remove(playerUuid);
        fetchedPlayers.remove(playerUuid);
    }

    public void clearAll() {
        capeTextures.clear();
        fetchedPlayers.clear();
    }
}
