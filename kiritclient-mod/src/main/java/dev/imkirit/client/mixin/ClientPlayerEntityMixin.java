package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import dev.imkirit.client.feature.WaypointManager;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.damage.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LivingEntity.class)
public abstract class ClientPlayerEntityMixin {

    /**
     * Intercepts LivingEntity.onDeath and filters to the local player.
     * If waypointDeathAutoset is enabled, automatically places a waypoint
     * at the death location.
     */
    @Inject(method = "onDeath", at = @At("HEAD"))
    private void kiritclient_onLivingEntityDeath(DamageSource damageSource, CallbackInfo ci) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null) return;

        // Only trigger for the local player
        LivingEntity self = (LivingEntity) (Object) this;
        if (self != client.player) return;

        KiritClientMod mod = KiritClientMod.getInstance();
        if (mod == null) return;

        KiritConfig cfg = mod.getConfig();
        if (!cfg.waypointsEnabled || !cfg.waypointDeathAutoset) return;

        WaypointManager wm = mod.getWaypointManager();
        if (wm == null) return;

        int x = (int) self.getX();
        int y = (int) self.getY();
        int z = (int) self.getZ();

        String name = String.format("Death (%d, %d, %d)", x, y, z);
        wm.addWaypoint(name, x, y, z, 0xFF4444);

        KiritClientMod.LOGGER.info("[KiritClient] Death waypoint set at {}, {}, {}", x, y, z);
    }
}
