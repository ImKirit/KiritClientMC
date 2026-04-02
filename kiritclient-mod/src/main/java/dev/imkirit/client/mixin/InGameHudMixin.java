package dev.imkirit.client.mixin;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.feature.FriendsManager;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import net.minecraft.client.render.RenderTickCounter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mixin to render KiritClient HUD elements (friends online, watermark).
 */
@Mixin(InGameHud.class)
public abstract class InGameHudMixin {

    @Inject(method = "render", at = @At("TAIL"))
    private void kiritclient_renderHud(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.options.hudHidden || client.currentScreen != null) return;

        int screenWidth = context.getScaledWindowWidth();

        // KiritClient watermark (top-left)
        context.drawTextWithShadow(client.textRenderer,
                "KiritClient", 4, 4, 0xAAFFFFFF);

        // Friends online count (top-right, below coordinates)
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
    }
}
