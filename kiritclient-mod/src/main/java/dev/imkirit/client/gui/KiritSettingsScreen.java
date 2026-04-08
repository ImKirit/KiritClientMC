package dev.imkirit.client.gui;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;

/**
 * Glass-style settings screen for KiritClient.
 * Tabs: General | Mods
 * Each Mods entry has a master toggle + expandable detail settings.
 */
public class KiritSettingsScreen extends Screen {

    private final Screen parent;
    private KiritConfig config;

    // Tabs
    private static final int TAB_GENERAL = 0;
    private static final int TAB_MODS    = 1;
    private int activeTab = TAB_GENERAL;

    // UI tracking
    private final List<ClickArea> clickAreas = new ArrayList<>();
    private int panelX, panelY, panelW, panelH;
    private int scrollOffset = 0;
    private int contentHeight = 0;

    // Expanded mod sub-settings
    private boolean hitboxExpanded  = false;
    private boolean waypointExpanded = false;

    public KiritSettingsScreen(Screen parent) {
        super(Text.literal("KiritClient Settings"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        config = KiritClientMod.getInstance().getConfig();
        scrollOffset = 0;
    }

    @Override
    public void render(DrawContext ctx, int mouseX, int mouseY, float delta) {
        clickAreas.clear();

        // Full-screen overlay
        ctx.fill(0, 0, this.width, this.height, GlassUI.BG_OVERLAY);

        // Main panel
        panelW = Math.min(380, this.width - 40);
        panelH = Math.min(this.height - 40, 520);
        panelX = (this.width - panelW) / 2;
        panelY = (this.height - panelH) / 2;

        GlassUI.drawPanel(ctx, panelX, panelY, panelW, panelH);

        // ── Title ──────────────────────────────────────────────────
        ctx.drawCenteredTextWithShadow(this.textRenderer, "KiritClient", panelX + panelW / 2, panelY + 8, GlassUI.TEXT_PRIMARY);
        ctx.drawCenteredTextWithShadow(this.textRenderer, "Settings", panelX + panelW / 2, panelY + 20, GlassUI.TEXT_SECONDARY);

        // ── Tab Bar ────────────────────────────────────────────────
        int tabY = panelY + 36;
        int tabW = (panelW - 24) / 2;
        int tabH = 16;
        int tabX = panelX + 12;

        drawTab(ctx, tabX,          tabY, tabW, tabH, "General", TAB_GENERAL, mouseX, mouseY);
        drawTab(ctx, tabX + tabW + 4, tabY, tabW, tabH, "Mods",    TAB_MODS,    mouseX, mouseY);

        // ── Scrollable content ────────────────────────────────────
        // Clip region (software clip via min/max in draw calls)
        int contentX  = panelX + 12;
        int contentW  = panelW - 24;
        int contentTop = tabY + tabH + 8;
        int contentBottom = panelY + panelH - 30; // above close button

        // Enable scissor for content area
        ctx.enableScissor(panelX + 1, contentTop, panelX + panelW - 1, contentBottom);

        int y = contentTop - scrollOffset;

        if (activeTab == TAB_GENERAL) {
            y = renderGeneralTab(ctx, contentX, contentW, y, mouseX, mouseY);
        } else {
            y = renderModsTab(ctx, contentX, contentW, y, mouseX, mouseY);
        }

        ctx.disableScissor();

        contentHeight = y + scrollOffset - contentTop;

        // ── Scrollbar ──────────────────────────────────────────────
        int visibleH = contentBottom - contentTop;
        if (contentHeight > visibleH) {
            int sbX = panelX + panelW - 5;
            int sbH = Math.max(20, visibleH * visibleH / contentHeight);
            int sbY = contentTop + (int) ((long) scrollOffset * (visibleH - sbH) / (contentHeight - visibleH));
            ctx.fill(sbX, sbY, sbX + 3, sbY + sbH, 0x33FFFFFF);
        }

        // ── Close button ────────────────────────────────────────────
        int closeX = panelX + panelW / 2 - 50;
        int closeY = panelY + panelH - 24;
        GlassUI.drawButton(ctx, closeX, closeY, 100, 18, mouseX, mouseY, false);
        ctx.drawCenteredTextWithShadow(this.textRenderer, "Close", panelX + panelW / 2, closeY + 5, GlassUI.TEXT_PRIMARY);
        clickAreas.add(new ClickArea(closeX, closeY, 100, 18, this::close));

        // ── Hints ──────────────────────────────────────────────────
        ctx.drawCenteredTextWithShadow(this.textRenderer, "RIGHT SHIFT = Menu | K = Fullbright",
                this.width / 2, this.height - 10, GlassUI.TEXT_MUTED);

        BrandingRenderer.render(ctx, this.width, this.height);
    }

    // ── Tab rendering ─────────────────────────────────────────────

    private void drawTab(DrawContext ctx, int x, int y, int w, int h, String label, int tabId, int mouseX, int mouseY) {
        boolean active  = (activeTab == tabId);
        boolean hovered = mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;

        int bg = active  ? 0x44FFFFFF :
                 hovered ? 0x22FFFFFF : 0x11FFFFFF;

        int r = 2;
        ctx.fill(x + r, y, x + w - r, y + h, bg);
        ctx.fill(x, y + r, x + r, y + h - r, bg);
        ctx.fill(x + w - r, y + r, x + w, y + h - r, bg);
        ctx.fill(x + 1, y + 1, x + r, y + r, bg);
        ctx.fill(x + w - r, y + 1, x + w - 1, y + r, bg);
        ctx.fill(x + 1, y + h - r, x + r, y + h - 1, bg);
        ctx.fill(x + w - r, y + h - r, x + w - 1, y + h - 1, bg);

        if (active) {
            ctx.fill(x + 2, y + h - 1, x + w - 2, y + h, 0xFFFFFFFF);
        }

        int textColor = active ? GlassUI.TEXT_PRIMARY : GlassUI.TEXT_SECONDARY;
        ctx.drawCenteredTextWithShadow(this.textRenderer, label, x + w / 2, y + (h - this.textRenderer.fontHeight) / 2, textColor);

        if (!active) {
            clickAreas.add(new ClickArea(x, y, w, h, () -> {
                activeTab = tabId;
                scrollOffset = 0;
            }));
        }
    }

    // ── General Tab ───────────────────────────────────────────────

    private int renderGeneralTab(DrawContext ctx, int contentX, int contentW, int y, int mouseX, int mouseY) {
        int btnW   = (contentW - 6) / 2;
        int btnH   = 18;
        int spacing = 22;

        GlassUI.drawSectionHeader(ctx, this.textRenderer, contentX, y, contentW, "Features");
        y += 16;

        // Row 1
        addToggle(ctx, contentX,           y, btnW, btnH, "Capes",    config.capesEnabled,    mouseX, mouseY, () -> { config.capesEnabled = !config.capesEnabled; config.save(); });
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Friends",  config.friendsEnabled,  mouseX, mouseY, () -> { config.friendsEnabled = !config.friendsEnabled; config.save(); });
        y += spacing;

        // Row 2
        addToggle(ctx, contentX,           y, btnW, btnH, "Cosmetics", config.cosmeticsEnabled, mouseX, mouseY, () -> { config.cosmeticsEnabled = !config.cosmeticsEnabled; config.save(); });
        addToggle(ctx, contentX + btnW + 6, y, btnW, btnH, "Fullbright", config.fullbrightEnabled, mouseX, mouseY, () -> { config.fullbrightEnabled = !config.fullbrightEnabled; config.save(); });
        y += spacing + 8;

        GlassUI.drawSectionHeader(ctx, this.textRenderer, contentX, y, contentW, "Keybinds");
        y += 16;

        ctx.drawTextWithShadow(this.textRenderer, "RIGHT SHIFT", contentX, y, GlassUI.TEXT_PRIMARY);
        ctx.drawTextWithShadow(this.textRenderer, "Open Settings", contentX + 80, y, GlassUI.TEXT_SECONDARY);
        y += 12;
        ctx.drawTextWithShadow(this.textRenderer, "K", contentX, y, GlassUI.TEXT_PRIMARY);
        ctx.drawTextWithShadow(this.textRenderer, "Toggle Fullbright", contentX + 80, y, GlassUI.TEXT_SECONDARY);
        y += 20;

        return y;
    }

    // ── Mods Tab ──────────────────────────────────────────────────

    private int renderModsTab(DrawContext ctx, int contentX, int contentW, int y, int mouseX, int mouseY) {
        int btnH    = 18;
        int subIndent = 8;
        int subW    = contentW - subIndent - 4;
        int subSpacing = 20;

        // ─ Waypoints ──────────────────────────────────────────────
        y = drawModHeader(ctx, contentX, contentW, y, btnH, "Waypoints", config.waypointsEnabled, mouseX, mouseY,
                () -> { config.waypointsEnabled = !config.waypointsEnabled; config.save(); },
                waypointExpanded, () -> waypointExpanded = !waypointExpanded);
        y += 4;

        if (waypointExpanded && config.waypointsEnabled) {
            int sx = contentX + subIndent;

            // Show Beam
            addSubToggle(ctx, sx, y, subW, 14, "Show Beam", config.waypointBeam, mouseX, mouseY,
                    () -> { config.waypointBeam = !config.waypointBeam; config.save(); });
            y += subSpacing - 4;

            // Show Distance
            addSubToggle(ctx, sx, y, subW, 14, "Show Distance", config.waypointDistance, mouseX, mouseY,
                    () -> { config.waypointDistance = !config.waypointDistance; config.save(); });
            y += subSpacing - 4;

            // Auto-set on Death
            addSubToggle(ctx, sx, y, subW, 14, "Auto Waypoint on Death", config.waypointDeathAutoset, mouseX, mouseY,
                    () -> { config.waypointDeathAutoset = !config.waypointDeathAutoset; config.save(); });
            y += subSpacing - 4;

            // Render Distance slider
            y = drawSliderRow(ctx, sx, y, subW, "Render Distance",
                    config.waypointRenderDistance, 50, 2000, mouseX, mouseY,
                    val -> { config.waypointRenderDistance = val; config.save(); },
                    config.waypointRenderDistance + "m");
            y += 6;
        }

        y += 4;

        // ─ Hitboxes ───────────────────────────────────────────────
        y = drawModHeader(ctx, contentX, contentW, y, btnH, "Hitboxes", config.hitboxesEnabled, mouseX, mouseY,
                () -> { config.hitboxesEnabled = !config.hitboxesEnabled; config.save(); },
                hitboxExpanded, () -> hitboxExpanded = !hitboxExpanded);
        y += 4;

        if (hitboxExpanded && config.hitboxesEnabled) {
            int sx = contentX + subIndent;

            // Show Health
            addSubToggle(ctx, sx, y, subW, 14, "Show Health", config.hitboxShowHealth, mouseX, mouseY,
                    () -> { config.hitboxShowHealth = !config.hitboxShowHealth; config.save(); });
            y += subSpacing - 4;

            // Opacity slider (hitboxAlpha 0.1..1.0)
            int alphaPercent = Math.round(config.hitboxAlpha * 100);
            y = drawSliderRow(ctx, sx, y, subW, "Opacity",
                    alphaPercent, 10, 100, mouseX, mouseY,
                    val -> { config.hitboxAlpha = val / 100f; config.save(); },
                    alphaPercent + "%");
            y += 6;

            // Color presets
            ctx.drawTextWithShadow(this.textRenderer, "Color", sx, y, GlassUI.TEXT_SECONDARY);
            y += 10;
            int[] colors = { 0xFFFF4444, 0xFF44FF88, 0xFF4488FF, 0xFFFFFF44, 0xFFFF44FF };
            String[] colorNames = { "Red", "Green", "Blue", "Yellow", "Pink" };
            int cbSize = 12;
            int cbSpacing = 18;
            for (int i = 0; i < colors.length; i++) {
                int cbX = sx + i * cbSpacing;
                int cbY = y;
                ctx.fill(cbX, cbY, cbX + cbSize, cbY + cbSize, colors[i]);

                // Current selection indicator
                float[] rgb = hexToRgb(colors[i]);
                boolean selected = Math.abs(config.hitboxRed - rgb[0]) < 0.05f
                        && Math.abs(config.hitboxGreen - rgb[1]) < 0.05f
                        && Math.abs(config.hitboxBlue - rgb[2]) < 0.05f;
                if (selected) {
                    ctx.fill(cbX - 1, cbY - 1, cbX + cbSize + 1, cbY + cbSize + 1, 0x66FFFFFF);
                    ctx.fill(cbX, cbY, cbX + cbSize, cbY + cbSize, colors[i]);
                }

                final int fi = i;
                final float[] frgb = rgb;
                clickAreas.add(new ClickArea(cbX, cbY, cbSize, cbSize, () -> {
                    config.hitboxRed   = frgb[0];
                    config.hitboxGreen = frgb[1];
                    config.hitboxBlue  = frgb[2];
                    config.save();
                }));
            }
            y += cbSize + 8;
        }

        y += 4;

        // ─ Fullbright ─────────────────────────────────────────────
        addToggle(ctx, contentX, y, contentW, btnH, "Fullbright  [K]", config.fullbrightEnabled, mouseX, mouseY,
                () -> { config.fullbrightEnabled = !config.fullbrightEnabled; config.save(); });
        y += 22;

        // ─ Friends ────────────────────────────────────────────────
        addToggle(ctx, contentX, y, contentW, btnH, "Friends Highlight", config.friendsEnabled, mouseX, mouseY,
                () -> { config.friendsEnabled = !config.friendsEnabled; config.save(); });
        y += 22;

        return y;
    }

    /**
     * Draws a mod header row: [icon] Label  [toggle]  [▼/▶]
     * Returns next Y after the header.
     */
    private int drawModHeader(DrawContext ctx, int x, int w, int y, int h,
                               String label, boolean enabled,
                               int mouseX, int mouseY,
                               Runnable toggleAction, boolean expanded, Runnable expandAction) {
        GlassUI.drawButton(ctx, x, y, w, h, mouseX, mouseY, false);

        // Colored status dot
        ctx.fill(x + 7, y + (h - 6) / 2, x + 13, y + (h + 6) / 2,
                enabled ? 0xFF44FF88 : 0xFFFF4444);

        // Label
        ctx.drawTextWithShadow(this.textRenderer, label, x + 18, y + (h - this.textRenderer.fontHeight) / 2,
                GlassUI.TEXT_PRIMARY);

        // Toggle area (right side, 40px wide)
        int toggleX = x + w - 44;
        GlassUI.drawToggle(ctx, this.textRenderer, toggleX, y, 40, h,
                "", enabled, mouseX, mouseY);
        // Override label text to show ON/OFF without extra ":"
        ctx.drawTextWithShadow(this.textRenderer, enabled ? "ON" : "OFF",
                toggleX + 15, y + (h - this.textRenderer.fontHeight) / 2,
                enabled ? GlassUI.TEXT_PRIMARY : GlassUI.TEXT_SECONDARY);

        // Expand arrow (only if enabled)
        if (enabled) {
            String arrow = expanded ? "v" : ">";
            ctx.drawTextWithShadow(this.textRenderer, arrow, x + w - 50, y + (h - this.textRenderer.fontHeight) / 2,
                    GlassUI.TEXT_MUTED);
            clickAreas.add(new ClickArea(x, y, w - 44, h, expandAction));
        } else {
            if (expanded) expandAction.run(); // collapse when disabled
        }

        clickAreas.add(new ClickArea(toggleX, y, 44, h, toggleAction));
        return y + h + 2;
    }

    private void addToggle(DrawContext ctx, int x, int y, int w, int h, String label, boolean value,
                            int mouseX, int mouseY, Runnable action) {
        GlassUI.drawToggle(ctx, this.textRenderer, x, y, w, h, label, value, mouseX, mouseY);
        clickAreas.add(new ClickArea(x, y, w, h, action));
    }

    private void addSubToggle(DrawContext ctx, int x, int y, int w, int h, String label, boolean value,
                               int mouseX, int mouseY, Runnable action) {
        boolean hovered = mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
        ctx.fill(x, y, x + w, y + h, hovered ? 0x18FFFFFF : 0x00000000);

        // Small dot
        ctx.fill(x + 4, y + (h - 4) / 2, x + 8, y + (h + 4) / 2,
                value ? 0xFF44FF88 : 0xFF606060);

        // Label + state
        ctx.drawTextWithShadow(this.textRenderer, label,
                x + 12, y + (h - this.textRenderer.fontHeight) / 2, GlassUI.TEXT_SECONDARY);

        String stateText = value ? "ON" : "OFF";
        int stateColor   = value ? 0xFF44FF88 : 0xFFFF4444;
        int stateX = x + w - this.textRenderer.getWidth(stateText) - 2;
        ctx.drawTextWithShadow(this.textRenderer, stateText,
                stateX, y + (h - this.textRenderer.fontHeight) / 2, stateColor);

        clickAreas.add(new ClickArea(x, y, w, h, action));
    }

    /**
     * Draws a labelled slider. Returns next Y.
     */
    private int drawSliderRow(DrawContext ctx, int x, int y, int w, String label,
                               int value, int min, int max,
                               int mouseX, int mouseY, java.util.function.IntConsumer setter,
                               String displayValue) {
        ctx.drawTextWithShadow(this.textRenderer, label,
                x, y, GlassUI.TEXT_SECONDARY);

        int valW = this.textRenderer.getWidth(displayValue);
        ctx.drawTextWithShadow(this.textRenderer, displayValue,
                x + w - valW, y, GlassUI.TEXT_PRIMARY);
        y += 10;

        // Slider track
        int trackH = 4;
        int trackY = y + 1;
        ctx.fill(x, trackY, x + w, trackY + trackH, 0x22FFFFFF);

        // Fill
        float pct = (float)(value - min) / (max - min);
        int fillW = (int)(w * pct);
        ctx.fill(x, trackY, x + fillW, trackY + trackH, 0x99FFFFFF);

        // Handle
        int handleX = x + fillW - 3;
        ctx.fill(handleX, trackY - 2, handleX + 6, trackY + trackH + 2, 0xFFFFFFFF);

        // Click to adjust
        boolean hovered = mouseX >= x && mouseX < x + w && mouseY >= trackY - 3 && mouseY < trackY + trackH + 3;
        if (hovered) {
            clickAreas.add(new ClickArea(x, trackY - 3, w, trackH + 6, () -> {
                float p = Math.max(0f, Math.min(1f, (float)(mouseX - x) / w));
                int newVal = min + Math.round(p * (max - min));
                setter.accept(newVal);
            }));
        }

        return y + trackH + 4;
    }

    // ── Input handling ────────────────────────────────────────────

    @Override
    public boolean mouseClicked(Click click, boolean bl) {
        if (click.button() == 0) {
            double mx = click.x();
            double my = click.y();
            for (ClickArea area : clickAreas) {
                if (mx >= area.x && mx < area.x + area.w && my >= area.y && my < area.y + area.h) {
                    area.action.run();
                    return true;
                }
            }
        }
        return super.mouseClicked(click, bl);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double horizontalAmount, double verticalAmount) {
        int contentTop  = panelY + 36 + 16 + 8; // tabY + tabH + gap
        int contentBottom = panelY + panelH - 30;
        int visibleH = contentBottom - contentTop;
        int maxScroll = Math.max(0, contentHeight - visibleH);
        scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset - (int)(verticalAmount * 12)));
        return true;
    }

    @Override
    public void close() {
        config.save();
        this.client.setScreen(parent);
    }

    @Override
    public boolean shouldPause() { return false; }

    // ── Helpers ───────────────────────────────────────────────────

    private float[] hexToRgb(int color) {
        return new float[]{
            ((color >> 16) & 0xFF) / 255f,
            ((color >> 8)  & 0xFF) / 255f,
            ( color        & 0xFF) / 255f
        };
    }

    private record ClickArea(int x, int y, int w, int h, Runnable action) {}
}
