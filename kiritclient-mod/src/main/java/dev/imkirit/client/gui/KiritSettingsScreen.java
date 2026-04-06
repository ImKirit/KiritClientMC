package dev.imkirit.client.gui;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Glass-style settings screen for KiritClient.
 * Custom rendering — no MC-style buttons. Rounded corners, transparent gray design.
 */
public class KiritSettingsScreen extends Screen {

    private static final List<String> BLOCK_OPTIONS = List.of(
            "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
            "minecraft:chest", "minecraft:ender_chest",
            "minecraft:spawner", "minecraft:ancient_debris"
    );
    private static final List<String> ENTITY_OPTIONS = List.of(
            "minecraft:player", "minecraft:zombie", "minecraft:creeper",
            "minecraft:skeleton", "minecraft:enderman", "minecraft:villager",
            "minecraft:item"
    );

    private final Screen parent;
    private KiritConfig config;

    // UI element tracking
    private final List<ClickArea> clickAreas = new ArrayList<>();
    private int panelX, panelY, panelW, panelH;
    private int scrollOffset = 0;
    private int contentHeight = 0;

    public KiritSettingsScreen(Screen parent) {
        super(Text.literal("KiritClient Settings"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        config = KiritClientMod.getInstance().getConfig();
    }

    @Override
    public void render(DrawContext ctx, int mouseX, int mouseY, float delta) {
        clickAreas.clear();

        // Full-screen dark overlay
        ctx.fill(0, 0, this.width, this.height, GlassUI.BG_OVERLAY);

        // Main panel (centered, responsive size)
        panelW = Math.min(360, this.width - 40);
        panelH = Math.min(this.height - 40, 500);
        panelX = (this.width - panelW) / 2;
        panelY = (this.height - panelH) / 2;

        GlassUI.drawPanel(ctx, panelX, panelY, panelW, panelH);

        // Title area
        ctx.drawCenteredTextWithShadow(this.textRenderer, "KiritClient", panelX + panelW / 2, panelY + 10, GlassUI.TEXT_PRIMARY);
        ctx.drawCenteredTextWithShadow(this.textRenderer, "Settings", panelX + panelW / 2, panelY + 22, GlassUI.TEXT_SECONDARY);

        // Content area (scrollable)
        int contentX = panelX + 10;
        int contentW = panelW - 20;
        int btnW = (contentW - 6) / 2;
        int btnH = 18;
        int spacing = 22;
        int y = panelY + 40 - scrollOffset;

        // === General ===
        GlassUI.drawSectionHeader(ctx, this.textRenderer, contentX, y, contentW, "General");
        y += 16;

        // Row 1: Capes + Hitboxes
        addToggle(ctx, contentX, y, btnW, btnH, "Capes", config.capesEnabled, mouseX, mouseY,
                () -> config.capesEnabled = !config.capesEnabled);
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Hitboxes", config.hitboxesEnabled, mouseX, mouseY,
                () -> config.hitboxesEnabled = !config.hitboxesEnabled);
        y += spacing;

        // Row 2: Waypoints + Friends
        addToggle(ctx, contentX, y, btnW, btnH, "Waypoints", config.waypointsEnabled, mouseX, mouseY,
                () -> config.waypointsEnabled = !config.waypointsEnabled);
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Friends", config.friendsEnabled, mouseX, mouseY,
                () -> config.friendsEnabled = !config.friendsEnabled);
        y += spacing;

        // Row 3: Cosmetics + Fullbright
        addToggle(ctx, contentX, y, btnW, btnH, "Cosmetics", config.cosmeticsEnabled, mouseX, mouseY,
                () -> config.cosmeticsEnabled = !config.cosmeticsEnabled);
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Fullbright", config.fullbrightEnabled, mouseX, mouseY,
                () -> config.fullbrightEnabled = !config.fullbrightEnabled);
        y += spacing + 6;

        // === ESP ===
        GlassUI.drawSectionHeader(ctx, this.textRenderer, contentX, y, contentW, "ESP");
        y += 16;

        addToggle(ctx, contentX, y, contentW, btnH, "ESP Master", config.espEnabled, mouseX, mouseY,
                () -> config.espEnabled = !config.espEnabled);
        y += spacing;

        addToggle(ctx, contentX, y, btnW, btnH, "Entity", config.entityEspEnabled, mouseX, mouseY,
                () -> config.entityEspEnabled = !config.entityEspEnabled);
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Block", config.blockEspEnabled, mouseX, mouseY,
                () -> config.blockEspEnabled = !config.blockEspEnabled);
        y += spacing;

        addToggle(ctx, contentX, y, btnW, btnH, "Items", config.itemEspEnabled, mouseX, mouseY,
                () -> config.itemEspEnabled = !config.itemEspEnabled);
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Storage", config.storageEspEnabled, mouseX, mouseY,
                () -> config.storageEspEnabled = !config.storageEspEnabled);
        y += spacing;

        addToggle(ctx, contentX, y, btnW, btnH, "Tracers", config.tracerEnabled, mouseX, mouseY,
                () -> config.tracerEnabled = !config.tracerEnabled);

        // Range button
        addButton(ctx, contentX + btnW + 6, y, btnW, btnH, "Range: " + config.espScanRange, mouseX, mouseY,
                () -> { config.espScanRange = config.espScanRange >= 96 ? 8 : config.espScanRange + 8; });
        y += spacing + 6;

        // === Block Selection ===
        GlassUI.drawSectionHeader(ctx, this.textRenderer, contentX, y, contentW, "Block ESP Selection");
        y += 14;

        for (String block : BLOCK_OPTIONS) {
            addSelection(ctx, contentX, y, contentW, 16, shortName(block), block, config.espSelectedBlocks, mouseX, mouseY);
            y += 18;
        }
        y += 4;

        // === Entity Selection ===
        GlassUI.drawSectionHeader(ctx, this.textRenderer, contentX, y, contentW, "Entity ESP Selection");
        y += 14;

        for (String entity : ENTITY_OPTIONS) {
            addSelection(ctx, contentX, y, contentW, 16, shortName(entity), entity, config.espSelectedEntities, mouseX, mouseY);
            y += 18;
        }
        y += 8;

        // Close button
        boolean closeHovered = GlassUI.drawButton(ctx, panelX + panelW / 2 - 50, panelY + panelH - 28, 100, 20, mouseX, mouseY, false);
        ctx.drawCenteredTextWithShadow(this.textRenderer, "Close", panelX + panelW / 2, panelY + panelH - 23, GlassUI.TEXT_PRIMARY);
        clickAreas.add(new ClickArea(panelX + panelW / 2 - 50, panelY + panelH - 28, 100, 20, this::close));

        contentHeight = y - (panelY + 40) + scrollOffset;

        // Keybind hints at bottom
        ctx.drawCenteredTextWithShadow(this.textRenderer, "RIGHT SHIFT = Menu | J = ESP | K = Fullbright",
                this.width / 2, this.height - 10, GlassUI.TEXT_MUTED);

        // Branding
        BrandingRenderer.render(ctx, this.width, this.height);
    }

    private void addToggle(DrawContext ctx, int x, int y, int w, int h, String label, boolean value,
                           int mouseX, int mouseY, Runnable action) {
        GlassUI.drawToggle(ctx, this.textRenderer, x, y, w, h, label, value, mouseX, mouseY);
        clickAreas.add(new ClickArea(x, y, w, h, () -> { action.run(); config.save(); }));
    }

    private void addButton(DrawContext ctx, int x, int y, int w, int h, String label,
                           int mouseX, int mouseY, Runnable action) {
        GlassUI.drawButton(ctx, x, y, w, h, mouseX, mouseY, false);
        ctx.drawCenteredTextWithShadow(this.textRenderer, label, x + w / 2, y + (h - this.textRenderer.fontHeight) / 2, GlassUI.TEXT_PRIMARY);
        clickAreas.add(new ClickArea(x, y, w, h, () -> { action.run(); config.save(); }));
    }

    private void addSelection(DrawContext ctx, int x, int y, int w, int h, String label, String id,
                              Set<String> set, int mouseX, int mouseY) {
        GlassUI.drawSelectionItem(ctx, this.textRenderer, x, y, w, h, label, set.contains(id), mouseX, mouseY);
        clickAreas.add(new ClickArea(x, y, w, h, () -> {
            if (set.contains(id)) set.remove(id); else set.add(id);
            config.save();
        }));
    }

    private String shortName(String id) {
        int i = id.indexOf(':');
        return i >= 0 ? id.substring(i + 1) : id;
    }

    @Override
    public boolean mouseClicked(Click click, boolean bl) {
        if (click.button() == 0) {
            double mouseX = click.x();
            double mouseY = click.y();
            for (ClickArea area : clickAreas) {
                if (mouseX >= area.x && mouseX < area.x + area.w && mouseY >= area.y && mouseY < area.y + area.h) {
                    area.action.run();
                    return true;
                }
            }
        }
        return super.mouseClicked(click, bl);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double horizontalAmount, double verticalAmount) {
        int maxScroll = Math.max(0, contentHeight - (panelH - 70));
        scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset - (int) (verticalAmount * 12)));
        return true;
    }

    @Override
    public void close() {
        config.save();
        this.client.setScreen(parent);
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    private record ClickArea(int x, int y, int w, int h, Runnable action) {}
}
