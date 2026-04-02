package dev.imkirit.client.feature;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import dev.imkirit.client.KiritClientMod;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderContext;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderEvents;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.render.*;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.Vec3d;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class WaypointManager {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final List<Waypoint> waypoints = new ArrayList<>();
    private Path waypointsFile;

    public WaypointManager() {
        // Register world render event for beam rendering
        WorldRenderEvents.AFTER_TRANSLUCENT.register(this::onWorldRender);
    }

    public static class Waypoint {
        public String name;
        public int x, y, z;
        public int color; // 0xRRGGBB
        public boolean visible = true;

        public Waypoint() {}

        public Waypoint(String name, int x, int y, int z, int color) {
            this.name = name;
            this.x = x;
            this.y = y;
            this.z = z;
            this.color = color;
        }
    }

    public void addWaypointAtPlayer(MinecraftClient client) {
        if (client.player == null) return;

        int x = (int) client.player.getX();
        int y = (int) client.player.getY();
        int z = (int) client.player.getZ();

        String name = String.format("Waypoint #%d", waypoints.size() + 1);
        int color = generateColor(waypoints.size());

        waypoints.add(new Waypoint(name, x, y, z, color));
        save();

        KiritClientMod.LOGGER.info("[KiritClient] Added waypoint '{}' at {}, {}, {}", name, x, y, z);
    }

    public void addWaypoint(String name, int x, int y, int z, int color) {
        waypoints.add(new Waypoint(name, x, y, z, color));
        save();
    }

    public void removeWaypoint(int index) {
        if (index >= 0 && index < waypoints.size()) {
            waypoints.remove(index);
            save();
        }
    }

    public List<Waypoint> getWaypoints() {
        return waypoints;
    }

    public void loadForServer(String serverAddress) {
        String safe = serverAddress.replaceAll("[^a-zA-Z0-9._-]", "_");
        waypointsFile = net.fabricmc.loader.api.FabricLoader.getInstance()
                .getConfigDir().resolve("kiritclient_waypoints_" + safe + ".json");

        waypoints.clear();
        if (Files.exists(waypointsFile)) {
            try {
                String json = Files.readString(waypointsFile);
                Type listType = new TypeToken<List<Waypoint>>() {}.getType();
                List<Waypoint> loaded = GSON.fromJson(json, listType);
                if (loaded != null) waypoints.addAll(loaded);
            } catch (Exception e) {
                KiritClientMod.LOGGER.warn("[KiritClient] Failed to load waypoints: {}", e.getMessage());
            }
        }
    }

    private void save() {
        if (waypointsFile == null) return;
        try {
            Files.writeString(waypointsFile, GSON.toJson(waypoints));
        } catch (IOException e) {
            KiritClientMod.LOGGER.error("[KiritClient] Failed to save waypoints: {}", e.getMessage());
        }
    }

    private void onWorldRender(WorldRenderContext context) {
        if (!KiritClientMod.getInstance().getConfig().waypointsEnabled) return;
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null || client.world == null) return;

        int maxDist = KiritClientMod.getInstance().getConfig().waypointRenderDistance;
        Vec3d cameraPos = context.camera().getPos();

        for (Waypoint wp : waypoints) {
            if (!wp.visible) continue;

            double dist = cameraPos.distanceTo(new Vec3d(wp.x + 0.5, wp.y + 0.5, wp.z + 0.5));
            if (dist > maxDist) continue;

            // Render beam and label
            renderWaypointBeam(context, wp, cameraPos, dist);
        }
    }

    private void renderWaypointBeam(WorldRenderContext context, Waypoint wp, Vec3d cameraPos, double dist) {
        // Beam and label rendering will be implemented with proper vertex buffers
        // For now this is the hook point — full rendering in next iteration
    }

    private int generateColor(int index) {
        int[] colors = {
                0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44,
                0xFF44FF, 0x44FFFF, 0xFF8844, 0x8844FF
        };
        return colors[index % colors.length];
    }
}
