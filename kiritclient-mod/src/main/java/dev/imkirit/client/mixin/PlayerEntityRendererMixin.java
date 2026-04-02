package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.render.OverlayTexture;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.entity.PlayerEntityRenderer;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.MathHelper;
import org.joml.Matrix4f;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mixin to render KiritClient capes on players.
 * Injects after the player model is rendered to add a custom cape layer.
 */
@Mixin(PlayerEntityRenderer.class)
public abstract class PlayerEntityRendererMixin {

    @Inject(method = "render(Lnet/minecraft/client/network/AbstractClientPlayerEntity;FFLnet/minecraft/client/util/math/MatrixStack;Lnet/minecraft/client/render/VertexConsumerProvider;I)V",
            at = @At("TAIL"))
    private void kiritclient_renderCape(AbstractClientPlayerEntity player, float yaw, float tickDelta,
                                         MatrixStack matrices, VertexConsumerProvider vertexConsumers,
                                         int light, CallbackInfo ci) {
        if (!KiritClientMod.getInstance().getConfig().capesEnabled) return;

        Identifier capeTexture = KiritClientMod.getInstance().getCapeManager()
                .getCapeTexture(player.getUuid());

        if (capeTexture == null) return;

        // Don't render cape if player is invisible
        if (player.isInvisible()) return;

        matrices.push();

        // Position cape on player's back
        matrices.translate(0.0, 0.0, 0.125);

        // Cape sway based on movement
        double motionX = player.prevX + (player.getX() - player.prevX) * tickDelta
                - (player.prevX + (player.getX() - player.prevX) * tickDelta);
        double motionZ = player.prevZ + (player.getZ() - player.prevZ) * tickDelta
                - (player.prevZ + (player.getZ() - player.prevZ) * tickDelta);

        float bodyYaw = MathHelper.lerp(tickDelta, player.prevBodyYaw, player.bodyYaw);
        float capeAngle = MathHelper.clamp(
                (float) (motionX * MathHelper.sin(bodyYaw * MathHelper.RADIANS_PER_DEGREE)
                        - motionZ * MathHelper.cos(bodyYaw * MathHelper.RADIANS_PER_DEGREE)),
                -1.0f, 1.0f
        ) * 30.0f;

        // Apply cape rotation
        matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(6.0f + capeAngle));

        // Render the cape quad
        VertexConsumer consumer = vertexConsumers.getBuffer(RenderLayer.getEntityCutout(capeTexture));
        Matrix4f model = matrices.peek().getPositionMatrix();

        float width = 0.625f;  // 10/16
        float height = 1.0f;   // 16/16

        // Cape quad (back face)
        consumer.vertex(model, -width / 2, 0, 0).color(255, 255, 255, 255)
                .texture(0, 0).overlay(OverlayTexture.DEFAULT_UV).light(light)
                .normal(0, 0, -1);
        consumer.vertex(model, width / 2, 0, 0).color(255, 255, 255, 255)
                .texture(1, 0).overlay(OverlayTexture.DEFAULT_UV).light(light)
                .normal(0, 0, -1);
        consumer.vertex(model, width / 2, -height, 0).color(255, 255, 255, 255)
                .texture(1, 1).overlay(OverlayTexture.DEFAULT_UV).light(light)
                .normal(0, 0, -1);
        consumer.vertex(model, -width / 2, -height, 0).color(255, 255, 255, 255)
                .texture(0, 1).overlay(OverlayTexture.DEFAULT_UV).light(light)
                .normal(0, 0, -1);

        matrices.pop();
    }
}
