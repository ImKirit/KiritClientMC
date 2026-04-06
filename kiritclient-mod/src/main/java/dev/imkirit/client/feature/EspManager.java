package dev.imkirit.client.feature;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.block.BlockState;
import net.minecraft.block.entity.BarrelBlockEntity;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.block.entity.ChestBlockEntity;
import net.minecraft.block.entity.EnderChestBlockEntity;
import net.minecraft.block.entity.HopperBlockEntity;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.entity.Entity;
import net.minecraft.entity.ItemEntity;
import net.minecraft.entity.mob.HostileEntity;
import net.minecraft.entity.passive.PassiveEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.entity.vehicle.ChestMinecartEntity;
import net.minecraft.entity.vehicle.HopperMinecartEntity;
import net.minecraft.particle.DustParticleEffect;
import net.minecraft.registry.Registries;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class EspManager {

    private final List<BlockPos> blockCache = new ArrayList<>();
    private final Set<Integer> glowingEntityIds = new HashSet<>();
    private long lastScanTick = -1L;

    public void tick(MinecraftClient client) {
        ClientWorld world = client.world;
        ClientPlayerEntity player = client.player;
        if (world == null || player == null) {
            clearGlowingEntities(null);
            return;
        }

        KiritConfig config = KiritClientMod.getInstance().getConfig();
        if (!config.espEnabled) {
            clearGlowingEntities(world);
            return;
        }

        refreshBlockCacheIfNeeded(config, world, player);
        renderBlockMarkers(config, world, player);
        updateEntityGlow(config, world, player);
    }

    private void refreshBlockCacheIfNeeded(KiritConfig config, ClientWorld world, ClientPlayerEntity player) {
        long currentTick = player.age;
        if (lastScanTick >= 0 && currentTick - lastScanTick < config.espBlockRefreshTicks) {
            return;
        }

        lastScanTick = currentTick;
        blockCache.clear();

        BlockPos origin = player.getBlockPos();
        int range = Math.max(8, Math.min(config.espScanRange, 96));
        int matches = 0;

        for (int x = -range; x <= range; x++) {
            for (int y = -range; y <= range; y++) {
                for (int z = -range; z <= range; z++) {
                    BlockPos pos = origin.add(x, y, z);
                    String id = Registries.BLOCK.getId(world.getBlockState(pos).getBlock()).toString();
                    if (config.espSelectedBlocks.contains(id)) {
                        blockCache.add(pos.toImmutable());
                        if (++matches >= 256) return;
                    }
                }
            }
        }
    }

    private void renderBlockMarkers(KiritConfig config, ClientWorld world, ClientPlayerEntity player) {
        if (!config.blockEspEnabled) return;

        for (BlockPos pos : blockCache) {
            if (player.squaredDistanceTo(Vec3d.ofCenter(pos)) > (double) config.espScanRange * config.espScanRange)
                continue;
            BlockState state = world.getBlockState(pos);
            if (state.isAir()) continue;
            spawnBlockMarker(world, pos, blockColor(state));
        }

        if (!config.storageEspEnabled) return;
        for (BlockEntity be : world.getBlockEntities()) {
            if (!isStorage(be)) continue;
            BlockPos pos = be.getPos();
            if (player.squaredDistanceTo(Vec3d.ofCenter(pos)) > (double) config.espScanRange * config.espScanRange)
                continue;
            spawnBlockMarker(world, pos, 0xFF9D2E);
        }
    }

    private void spawnBlockMarker(ClientWorld world, BlockPos pos, int color) {
        DustParticleEffect particle = new DustParticleEffect(color, 1.2f);
        Box box = new Box(pos).shrink(0.04, 0.04, 0.04);
        double[][] corners = {
                {box.minX, box.minY, box.minZ}, {box.maxX, box.minY, box.minZ},
                {box.minX, box.minY, box.maxZ}, {box.maxX, box.minY, box.maxZ},
                {box.minX, box.maxY, box.minZ}, {box.maxX, box.maxY, box.minZ},
                {box.minX, box.maxY, box.maxZ}, {box.maxX, box.maxY, box.maxZ}
        };
        for (double[] c : corners) {
            world.addParticleClient(particle, c[0], c[1], c[2], 0, 0, 0);
        }
    }

    private void updateEntityGlow(KiritConfig config, ClientWorld world, ClientPlayerEntity player) {
        Set<Integer> active = new HashSet<>();

        for (Entity entity : world.getEntities()) {
            if (shouldHighlight(entity, config, player)) {
                entity.setGlowing(true);
                active.add(entity.getId());
            }
        }

        for (int id : new HashSet<>(glowingEntityIds)) {
            if (!active.contains(id)) {
                Entity e = world.getEntityById(id);
                if (e != null) e.setGlowing(false);
            }
        }

        glowingEntityIds.clear();
        glowingEntityIds.addAll(active);
    }

    private void clearGlowingEntities(ClientWorld world) {
        if (world != null) {
            for (int id : glowingEntityIds) {
                Entity e = world.getEntityById(id);
                if (e != null) e.setGlowing(false);
            }
        }
        glowingEntityIds.clear();
    }

    private boolean shouldHighlight(Entity entity, KiritConfig config, ClientPlayerEntity player) {
        if (entity == player || entity.isRemoved()) return false;
        if (entity.squaredDistanceTo(player) > (double) config.espScanRange * config.espScanRange) return false;

        if (entity instanceof ItemEntity)
            return config.itemEspEnabled && config.espSelectedEntities.contains("minecraft:item");
        if (entity instanceof ChestMinecartEntity || entity instanceof HopperMinecartEntity)
            return config.storageEspEnabled;

        String entityId = Registries.ENTITY_TYPE.getId(entity.getType()).toString();
        return config.entityEspEnabled && config.espSelectedEntities.contains(entityId);
    }

    private boolean isStorage(BlockEntity be) {
        return be instanceof ChestBlockEntity || be instanceof EnderChestBlockEntity
                || be instanceof BarrelBlockEntity || be instanceof HopperBlockEntity;
    }

    private int blockColor(BlockState state) {
        String id = Registries.BLOCK.getId(state.getBlock()).toString();
        if (id.contains("diamond")) return 0x00E5FF;
        if (id.contains("ancient_debris")) return 0xC26A34;
        if (id.contains("spawner")) return 0x9B59FF;
        if (id.contains("ender_chest")) return 0x6DFFB0;
        if (id.contains("chest")) return 0xFF9D2E;
        return 0xFFD447;
    }

    public Set<Integer> getGlowingEntityIds() {
        return glowingEntityIds;
    }
}
