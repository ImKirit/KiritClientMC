package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
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
