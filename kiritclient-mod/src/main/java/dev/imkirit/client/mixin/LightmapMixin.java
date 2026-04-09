package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import net.minecraft.client.render.LightmapTextureManager;
import net.minecraft.entity.LivingEntity;
import net.minecraft.world.dimension.DimensionType;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Overrides the lightmap brightness calculations to force full brightness
 * when Fullbright is enabled. This makes caves and night appear as bright as day.
 */
@Mixin(LightmapTextureManager.class)
public abstract class LightmapMixin {

    @Inject(method = "getBrightness(Lnet/minecraft/world/dimension/DimensionType;I)F",
            at = @At("HEAD"), cancellable = true)
    private static void kiritclient_maxBrightness(DimensionType type, int lightLevel,
                                                   CallbackInfoReturnable<Float> cir) {
        KiritClientMod mod = KiritClientMod.getInstance();
        if (mod != null && mod.getConfig().fullbrightEnabled) {
            cir.setReturnValue(1.0f);
        }
    }

    @Inject(method = "getBrightness(FI)F",
            at = @At("HEAD"), cancellable = true)
    private static void kiritclient_maxBrightnessGamma(float gamma, int lightLevel,
                                                        CallbackInfoReturnable<Float> cir) {
        KiritClientMod mod = KiritClientMod.getInstance();
        if (mod != null && mod.getConfig().fullbrightEnabled) {
            cir.setReturnValue(1.0f);
        }
    }

    @Inject(method = "getDarkness", at = @At("HEAD"), cancellable = true)
    private void kiritclient_noDarkness(LivingEntity entity, float factor, float delta,
                                         CallbackInfoReturnable<Float> cir) {
        KiritClientMod mod = KiritClientMod.getInstance();
        if (mod != null && mod.getConfig().fullbrightEnabled) {
            cir.setReturnValue(0.0f);
        }
    }
}
