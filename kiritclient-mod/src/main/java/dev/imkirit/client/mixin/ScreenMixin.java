package dev.imkirit.client.mixin;

import dev.imkirit.client.gui.BrandingRenderer;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Adds KiritClient branding to ALL screens (ESC menu, inventories, settings, etc.)
 */
@Mixin(Screen.class)
public abstract class ScreenMixin {

    @Shadow public int width;
    @Shadow public int height;

    @Inject(method = "render", at = @At("TAIL"))
    private void kiritclient_renderBranding(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        BrandingRenderer.render(context, this.width, this.height);
    }
}
