package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.entity.EntityRenderer;
import net.minecraft.client.render.entity.state.EntityRenderState;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mixin to replace vanilla hitbox rendering with KiritClient's custom hitboxes.
 */
@Mixin(EntityRenderer.class)
public abstract class EntityRendererMixin<T extends Entity, S extends EntityRenderState> {

    @Inject(method = "render", at = @At("HEAD"))
    private void kiritclient_beforeRender(S state, MatrixStack matrices,
                                           VertexConsumerProvider vertexConsumers,
                                           int light, CallbackInfo ci) {
        // Custom hitbox rendering is triggered from the HitboxRenderer
        // which checks if hitboxes are enabled in config
    }
}
