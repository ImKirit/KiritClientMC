package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.render.command.OrderedRenderCommandQueue;
import net.minecraft.client.render.entity.EntityRenderer;
import net.minecraft.client.render.entity.state.EntityRenderState;
import net.minecraft.client.render.state.CameraRenderState;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.Entity;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;
import net.minecraft.client.render.DrawStyle;
import net.minecraft.world.debug.gizmo.GizmoDrawing;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mixin to render custom colored hitboxes around entities when the feature is enabled.
 * Uses the new MC 1.21.11 GizmoDrawing API.
 */
@Mixin(EntityRenderer.class)
public abstract class EntityRendererMixin<T extends Entity, S extends EntityRenderState> {

    @Inject(method = "render", at = @At("TAIL"))
    private void kiritclient_renderHitbox(S state, MatrixStack matrices,
                                           OrderedRenderCommandQueue commandQueue,
                                           CameraRenderState cameraState, CallbackInfo ci) {
        KiritClientMod mod = KiritClientMod.getInstance();
        if (mod == null) return;
        KiritConfig config = mod.getConfig();
        if (!config.hitboxesEnabled) return;

        // Build AABB from entity render state position and dimensions
        double halfW = state.width / 2.0;
        double x = state.x;
        double y = state.y;
        double z = state.z;

        Box aabb = new Box(
                x - halfW, y, z - halfW,
                x + halfW, y + state.height, z + halfW
        );

        int r = (int) (config.hitboxRed * 255);
        int g = (int) (config.hitboxGreen * 255);
        int b = (int) (config.hitboxBlue * 255);
        int a = (int) (config.hitboxAlpha * 255);
        int color = (a << 24) | (r << 16) | (g << 8) | b;

        try {
            GizmoDrawing.box(aabb, DrawStyle.stroked(color));
        } catch (Throwable ignored) {
            // GizmoDrawing may not be active in all render contexts
        }
    }
}
