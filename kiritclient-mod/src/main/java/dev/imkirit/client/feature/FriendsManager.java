package dev.imkirit.client.feature;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import dev.imkirit.client.KiritClientMod;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Friends system — add/remove friends, see online status.
 * Friends list is stored locally + synced with KiritClient API.
 */
public class FriendsManager {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final Path FRIENDS_FILE = FabricLoader.getInstance()
            .getConfigDir().resolve("kiritclient_friends.json");

    private final Set<UUID> friends = ConcurrentHashMap.newKeySet();
    private final Map<UUID, String> friendNames = new ConcurrentHashMap<>();
    private final Set<UUID> onlineFriends = ConcurrentHashMap.newKeySet();
    private final HttpClient httpClient;

    public FriendsManager() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        loadFriends();
    }

    public void addFriend(UUID uuid, String name) {
        friends.add(uuid);
        friendNames.put(uuid, name);
        saveFriends();
        KiritClientMod.LOGGER.info("[KiritClient] Added friend: {} ({})", name, uuid);
    }

    public void removeFriend(UUID uuid) {
        friends.remove(uuid);
        String name = friendNames.remove(uuid);
        onlineFriends.remove(uuid);
        saveFriends();
        KiritClientMod.LOGGER.info("[KiritClient] Removed friend: {} ({})", name, uuid);
    }

    public boolean isFriend(UUID uuid) {
        return friends.contains(uuid);
    }

    public Set<UUID> getFriends() {
        return Collections.unmodifiableSet(friends);
    }

    public String getFriendName(UUID uuid) {
        return friendNames.getOrDefault(uuid, uuid.toString().substring(0, 8));
    }

    public boolean isOnline(UUID uuid) {
        return onlineFriends.contains(uuid);
    }

    /**
     * Called when a player joins the current server — check if they're a friend.
     */
    public void onPlayerJoin(UUID uuid, String name) {
        if (friends.contains(uuid)) {
            onlineFriends.add(uuid);
            // Update name in case it changed
            friendNames.put(uuid, name);
            saveFriends();
        }
    }

    /**
     * Called when a player leaves the current server.
     */
    public void onPlayerLeave(UUID uuid) {
        onlineFriends.remove(uuid);
    }

    /**
     * Clear online status (e.g. when disconnecting).
     */
    public void clearOnline() {
        onlineFriends.clear();
    }

    public int getOnlineCount() {
        return onlineFriends.size();
    }

    public int getTotalCount() {
        return friends.size();
    }

    private void loadFriends() {
        if (!Files.exists(FRIENDS_FILE)) return;
        try {
            String json = Files.readString(FRIENDS_FILE);
            Type type = new TypeToken<Map<String, String>>() {}.getType();
            Map<String, String> data = GSON.fromJson(json, type);
            if (data != null) {
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    try {
                        UUID uuid = UUID.fromString(entry.getKey());
                        friends.add(uuid);
                        friendNames.put(uuid, entry.getValue());
                    } catch (IllegalArgumentException ignored) {}
                }
            }
            KiritClientMod.LOGGER.info("[KiritClient] Loaded {} friends", friends.size());
        } catch (Exception e) {
            KiritClientMod.LOGGER.warn("[KiritClient] Failed to load friends: {}", e.getMessage());
        }
    }

    private void saveFriends() {
        try {
            Map<String, String> data = new LinkedHashMap<>();
            for (UUID uuid : friends) {
                data.put(uuid.toString(), friendNames.getOrDefault(uuid, "Unknown"));
            }
            Files.createDirectories(FRIENDS_FILE.getParent());
            Files.writeString(FRIENDS_FILE, GSON.toJson(data));
        } catch (IOException e) {
            KiritClientMod.LOGGER.error("[KiritClient] Failed to save friends: {}", e.getMessage());
        }
    }
}
