package dev.imkirit.client.cape;

import dev.imkirit.client.KiritClientMod;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages cape textures for KiritClient users.
 * Fetches capes from the KiritClient API and caches them as textures.
 */
public class CapeManager {

    private final Map<UUID, Identifier> capeTextures = new ConcurrentHashMap<>();
    private final Set<UUID> fetchedPlayers = ConcurrentHashMap.newKeySet();
    private final Set<UUID> fetchingPlayers = ConcurrentHashMap.newKeySet();
    private final HttpClient httpClient;

    public CapeManager() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Get the cape texture identifier for a player, or null if none.
     * Triggers async fetch if not yet loaded.
     */
    public Identifier getCapeTexture(UUID playerUuid) {
        if (!KiritClientMod.getInstance().getConfig().capesEnabled) return null;

        // Already cached
        if (capeTextures.containsKey(playerUuid)) {
            return capeTextures.get(playerUuid);
        }

        // Already fetched (no cape) or currently fetching
        if (fetchedPlayers.contains(playerUuid) || fetchingPlayers.contains(playerUuid)) {
            return null;
        }

        // Trigger async fetch
        fetchCapeAsync(playerUuid);
        return null;
    }

    private void fetchCapeAsync(UUID playerUuid) {
        if (!fetchingPlayers.add(playerUuid)) return;

        String apiUrl = KiritClientMod.getInstance().getConfig().capeApiUrl;
        String url = apiUrl + "/api/capes/" + playerUuid.toString().replace("-", "");

        CompletableFuture.runAsync(() -> {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build();

                HttpResponse<InputStream> response = httpClient.send(request,
                        HttpResponse.BodyHandlers.ofInputStream());

                if (response.statusCode() == 200) {
                    String contentType = response.headers().firstValue("content-type").orElse("");
                    if (contentType.contains("image/png")) {
                        // Direct PNG response
                        NativeImage image = NativeImage.read(response.body());
                        registerCapeTexture(playerUuid, image);
                    }
                    // 404 = no cape, just mark as fetched
                }
            } catch (Exception e) {
                KiritClientMod.LOGGER.debug("[KiritClient] Failed to fetch cape for {}: {}",
                        playerUuid, e.getMessage());
            } finally {
                fetchedPlayers.add(playerUuid);
                fetchingPlayers.remove(playerUuid);
            }
        });
    }

    private void registerCapeTexture(UUID playerUuid, NativeImage image) {
        MinecraftClient client = MinecraftClient.getInstance();
        client.execute(() -> {
            Identifier id = Identifier.of(KiritClientMod.MOD_ID, "cape/" + playerUuid.toString().replace("-", ""));
            NativeImageBackedTexture texture = new NativeImageBackedTexture(image);
            client.getTextureManager().registerTexture(id, texture);
            capeTextures.put(playerUuid, id);
            KiritClientMod.LOGGER.info("[KiritClient] Loaded cape for {}", playerUuid);
        });
    }

    /**
     * Called when a player leaves — clean up their cape texture.
     */
    public void onPlayerLeave(UUID playerUuid) {
        Identifier texture = capeTextures.remove(playerUuid);
        if (texture != null) {
            MinecraftClient.getInstance().execute(() ->
                    MinecraftClient.getInstance().getTextureManager().destroyTexture(texture));
        }
        fetchedPlayers.remove(playerUuid);
    }

    /**
     * Batch fetch capes for multiple players (called when joining a server).
     */
    public void fetchBatch(Set<UUID> playerUuids) {
        for (UUID uuid : playerUuids) {
            getCapeTexture(uuid);
        }
    }

    /**
     * Clear all cached capes.
     */
    public void clearAll() {
        MinecraftClient client = MinecraftClient.getInstance();
        client.execute(() -> {
            for (Identifier id : capeTextures.values()) {
                client.getTextureManager().destroyTexture(id);
            }
            capeTextures.clear();
            fetchedPlayers.clear();
        });
    }
}
