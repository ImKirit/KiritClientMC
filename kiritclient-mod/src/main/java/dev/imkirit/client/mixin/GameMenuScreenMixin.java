package dev.imkirit.client.mixin;

import dev.imkirit.client.gui.KiritSettingsScreen;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Adds a "KiritClient" button to the ESC/pause menu.
 */
@Mixin(GameMenuScreen.class)
public abstract class GameMenuScreenMixin extends Screen {

    protected GameMenuScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "initWidgets", at = @At("TAIL"))
    private void kiritclient_addButton(CallbackInfo ci) {
        // Add KiritClient button at bottom-left
        addDrawableChild(ButtonWidget.builder(
                Text.literal("KiritClient"),
                button -> {
                    if (this.client != null) {
                        this.client.setScreen(new KiritSettingsScreen((Screen) (Object) this));
                    }
                }
        ).dimensions(this.width / 2 - 102, this.height - 28, 204, 20).build());
    }
}
