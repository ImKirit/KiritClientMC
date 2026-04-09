package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import dev.imkirit.client.feature.FriendsManager;
import dev.imkirit.client.gui.BrandingRenderer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import net.minecraft.client.render.RenderTickCounter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(InGameHud.class)
public abstract class InGameHudMixin {

    @Inject(method = "renderCrosshair", at = @At("HEAD"), cancellable = true)
    private void kiritclient_hideCrosshair(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        if (KiritClientMod.getInstance() != null
                && KiritClientMod.getInstance().getConfig().customCrosshairEnabled) {
            ci.cancel();
        }
    }

    @Inject(method = "render", at = @At("TAIL"))
    private void kiritclient_renderHud(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.options.hudHidden || client.currentScreen != null) return;

        int screenWidth = context.getScaledWindowWidth();
        int screenHeight = context.getScaledWindowHeight();

        // Branding (bottom-right)
        BrandingRenderer.render(context, screenWidth, screenHeight);

        // Friends online count (top-right)
        if (KiritClientMod.getInstance().getConfig().friendsEnabled) {
            FriendsManager friends = KiritClientMod.getInstance().getFriendsManager();
            int online = friends.getOnlineCount();
            int total = friends.getTotalCount();

            if (total > 0) {
                String text = "Friends: " + online + "/" + total + " online";
                int textWidth = client.textRenderer.getWidth(text);
                context.drawTextWithShadow(client.textRenderer,
                        text, screenWidth - textWidth - 4, 4,
                        online > 0 ? 0xFF44FF88 : 0xFFAAAAAA);
            }
        }

        // Custom Crosshair
        if (KiritClientMod.getInstance().getConfig().customCrosshairEnabled) {
            KiritConfig cfg = KiritClientMod.getInstance().getConfig();
            int cx = screenWidth / 2;
            int cy = screenHeight / 2;
            int color = ((int)(cfg.crosshairAlpha * 255) << 24)
                      | ((int)(cfg.crosshairRed * 255) << 16)
                      | ((int)(cfg.crosshairGreen * 255) << 8)
                      | (int)(cfg.crosshairBlue * 255);
            int size = cfg.crosshairSize;
            int thick = cfg.crosshairThickness;
            int gap = cfg.crosshairGap;
            int half = thick / 2;

            switch (cfg.crosshairType) {
                case "plus" -> {
                    // Top
                    context.fill(cx - half, cy - gap - size, cx + half + (thick % 2), cy - gap, color);
                    // Bottom
                    context.fill(cx - half, cy + gap, cx + half + (thick % 2), cy + gap + size, color);
                    // Left
                    context.fill(cx - gap - size, cy - half, cx - gap, cy + half + (thick % 2), color);
                    // Right
                    context.fill(cx + gap, cy - half, cx + gap + size, cy + half + (thick % 2), color);
                }
                case "dot" -> {
                    int dotSize = Math.max(2, thick);
                    int dh = dotSize / 2;
                    context.fill(cx - dh, cy - dh, cx + dh + (dotSize % 2), cy + dh + (dotSize % 2), color);
                }
                case "circle" -> {
                    int radius = size;
                    for (int angle = 0; angle < 360; angle += 3) {
                        double rad = Math.toRadians(angle);
                        int px = cx + (int)(Math.cos(rad) * radius);
                        int py = cy + (int)(Math.sin(rad) * radius);
                        context.fill(px, py, px + 1, py + 1, color);
                    }
                }
            }
        }

        // Coordinates HUD (top-left)
        if (KiritClientMod.getInstance().getConfig().coordsHudEnabled && client.player != null) {
            int x = (int) Math.floor(client.player.getX());
            int y = (int) Math.floor(client.player.getY());
            int z = (int) Math.floor(client.player.getZ());
            String facing = switch (client.player.getHorizontalFacing()) {
                case NORTH -> "N (-Z)";
                case SOUTH -> "S (+Z)";
                case WEST -> "W (-X)";
                case EAST -> "E (+X)";
                default -> "";
            };

            String coordsLine = String.format("XYZ: %d / %d / %d", x, y, z);
            String facingLine = "Facing: " + facing;

            // Background for readability
            int bgW = Math.max(client.textRenderer.getWidth(coordsLine),
                    client.textRenderer.getWidth(facingLine)) + 8;
            context.fill(2, 2, 2 + bgW, 26, 0x80000000);

            context.drawTextWithShadow(client.textRenderer, coordsLine, 6, 5, 0xFFFFFFFF);
            context.drawTextWithShadow(client.textRenderer, facingLine, 6, 15, 0xFFAAAAAA);
        }
    }
}
