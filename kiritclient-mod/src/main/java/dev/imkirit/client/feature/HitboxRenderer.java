package dev.imkirit.client.feature;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.Entity;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.MathHelper;
import org.joml.Matrix3f;
import org.joml.Matrix4f;

/**
 * Custom hitbox rendering with color, health indicator and better visibility.
 */
public class HitboxRenderer {

    public boolean shouldRender() {
        return KiritClientMod.getInstance().getConfig().hitboxesEnabled;
    }

    /**
     * Render a custom hitbox for the given entity.
     * Called from EntityRendererMixin instead of vanilla hitbox rendering.
     */
    public void render(Entity entity, MatrixStack matrices, VertexConsumerProvider vertexConsumers, float tickDelta) {
        KiritConfig config = KiritClientMod.getInstance().getConfig();

        Box box = entity.getBoundingBox().offset(-entity.getX(), -entity.getY(), -entity.getZ());

        float r = config.hitboxRed;
        float g = config.hitboxGreen;
        float b = config.hitboxBlue;
        float a = config.hitboxAlpha;

        // Color based on health for living entities
        if (entity instanceof LivingEntity living && config.hitboxShowHealth) {
            float healthPercent = living.getHealth() / living.getMaxHealth();
            r = 1.0f - healthPercent;
            g = healthPercent;
            b = 0.2f;
        }

        // Different color for players
        if (entity instanceof PlayerEntity) {
            KiritConfig cfg = KiritClientMod.getInstance().getConfig();
            r = cfg.hitboxRed;
            g = cfg.hitboxGreen;
            b = cfg.hitboxBlue;
        }

        VertexConsumer consumer = vertexConsumers.getBuffer(RenderLayer.getDebugLineStrip(1.0));
        drawBox(matrices, consumer, box, r, g, b, a);

        // Eye height line
        float eyeHeight = entity.getStandingEyeHeight();
        drawLine(matrices, consumer,
                (float) box.minX, eyeHeight, (float) box.minZ,
                (float) box.maxX, eyeHeight, (float) box.maxZ,
                0.0f, 0.0f, 1.0f, 0.6f);

        // Look direction
        float yaw = MathHelper.lerp(tickDelta, entity.prevYaw, entity.getYaw());
        float lookX = -MathHelper.sin(yaw * MathHelper.RADIANS_PER_DEGREE);
        float lookZ = MathHelper.cos(yaw * MathHelper.RADIANS_PER_DEGREE);
        drawLine(matrices, consumer,
                0, eyeHeight, 0,
                lookX * 2, eyeHeight, lookZ * 2,
                0.0f, 1.0f, 1.0f, 0.8f);
    }

    private void drawBox(MatrixStack matrices, VertexConsumer consumer, Box box,
                          float r, float g, float b, float a) {
        MatrixStack.Entry entry = matrices.peek();
        Matrix4f model = entry.getPositionMatrix();

        float x0 = (float) box.minX, y0 = (float) box.minY, z0 = (float) box.minZ;
        float x1 = (float) box.maxX, y1 = (float) box.maxY, z1 = (float) box.maxZ;

        // Bottom
        vertex(consumer, model, x0, y0, z0, r, g, b, a);
        vertex(consumer, model, x1, y0, z0, r, g, b, a);
        vertex(consumer, model, x1, y0, z1, r, g, b, a);
        vertex(consumer, model, x0, y0, z1, r, g, b, a);
        vertex(consumer, model, x0, y0, z0, r, g, b, a);

        // Top
        vertex(consumer, model, x0, y1, z0, r, g, b, a);
        vertex(consumer, model, x1, y1, z0, r, g, b, a);
        vertex(consumer, model, x1, y1, z1, r, g, b, a);
        vertex(consumer, model, x0, y1, z1, r, g, b, a);
        vertex(consumer, model, x0, y1, z0, r, g, b, a);

        // Vertical edges
        vertex(consumer, model, x1, y0, z0, r, g, b, a);
        vertex(consumer, model, x1, y1, z0, r, g, b, a);
        vertex(consumer, model, x1, y0, z1, r, g, b, a);
        vertex(consumer, model, x1, y1, z1, r, g, b, a);
        vertex(consumer, model, x0, y0, z1, r, g, b, a);
        vertex(consumer, model, x0, y1, z1, r, g, b, a);
    }

    private void drawLine(MatrixStack matrices, VertexConsumer consumer,
                           float x0, float y0, float z0,
                           float x1, float y1, float z1,
                           float r, float g, float b, float a) {
        Matrix4f model = matrices.peek().getPositionMatrix();
        vertex(consumer, model, x0, y0, z0, r, g, b, a);
        vertex(consumer, model, x1, y1, z1, r, g, b, a);
    }

    private void vertex(VertexConsumer consumer, Matrix4f model,
                         float x, float y, float z,
                         float r, float g, float b, float a) {
        consumer.vertex(model, x, y, z).color(r, g, b, a);
    }
}
