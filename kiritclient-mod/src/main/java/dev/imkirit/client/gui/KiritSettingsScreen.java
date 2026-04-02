package dev.imkirit.client.gui;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

/**
 * In-game settings screen for KiritClient features.
 * Opened with RIGHT_SHIFT key.
 */
public class KiritSettingsScreen extends Screen {

    private final Screen parent;
    private KiritConfig config;

    public KiritSettingsScreen(Screen parent) {
        super(Text.literal("KiritClient Settings"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        config = KiritClientMod.getInstance().getConfig();

        int centerX = this.width / 2;
        int y = 50;
        int btnWidth = 200;
        int btnHeight = 20;
        int spacing = 26;

        // Title is rendered in render()

        // Capes toggle
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Capes: " + (config.capesEnabled ? "ON" : "OFF")),
                button -> {
                    config.capesEnabled = !config.capesEnabled;
                    button.setMessage(Text.literal("Capes: " + (config.capesEnabled ? "ON" : "OFF")));
                    config.save();
                }
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
        y += spacing;

        // Hitboxes toggle
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Hitboxes: " + (config.hitboxesEnabled ? "ON" : "OFF")),
                button -> {
                    config.hitboxesEnabled = !config.hitboxesEnabled;
                    button.setMessage(Text.literal("Hitboxes: " + (config.hitboxesEnabled ? "ON" : "OFF")));
                    config.save();
                }
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
        y += spacing;

        // Hitbox health colors
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Health Colors: " + (config.hitboxShowHealth ? "ON" : "OFF")),
                button -> {
                    config.hitboxShowHealth = !config.hitboxShowHealth;
                    button.setMessage(Text.literal("Health Colors: " + (config.hitboxShowHealth ? "ON" : "OFF")));
                    config.save();
                }
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
        y += spacing;

        // Waypoints toggle
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Waypoints: " + (config.waypointsEnabled ? "ON" : "OFF")),
                button -> {
                    config.waypointsEnabled = !config.waypointsEnabled;
                    button.setMessage(Text.literal("Waypoints: " + (config.waypointsEnabled ? "ON" : "OFF")));
                    config.save();
                }
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
        y += spacing;

        // Friends toggle
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Friends: " + (config.friendsEnabled ? "ON" : "OFF")),
                button -> {
                    config.friendsEnabled = !config.friendsEnabled;
                    button.setMessage(Text.literal("Friends: " + (config.friendsEnabled ? "ON" : "OFF")));
                    config.save();
                }
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
        y += spacing;

        // Cosmetics toggle
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Cosmetics: " + (config.cosmeticsEnabled ? "ON" : "OFF")),
                button -> {
                    config.cosmeticsEnabled = !config.cosmeticsEnabled;
                    button.setMessage(Text.literal("Cosmetics: " + (config.cosmeticsEnabled ? "ON" : "OFF")));
                    config.save();
                }
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
        y += spacing + 10;

        // Done button
        addDrawableChild(ButtonWidget.builder(
                Text.literal("Done"),
                button -> close()
        ).dimensions(centerX - btnWidth / 2, y, btnWidth, btnHeight).build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // Dark semi-transparent background
        context.fill(0, 0, this.width, this.height, 0x88000000);

        // Title
        context.drawCenteredTextWithShadow(this.textRenderer,
                Text.literal("KiritClient Settings"), this.width / 2, 25, 0xFFFFFF);

        // Subtitle
        context.drawCenteredTextWithShadow(this.textRenderer,
                Text.literal("Press RIGHT SHIFT to open/close"), this.width / 2, 37, 0x888888);

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public void close() {
        config.save();
        this.client.setScreen(parent);
    }

    @Override
    public boolean shouldPause() {
        return false; // Don't pause the game
    }
}
