package dev.imkirit.client.gui;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.gui.Click;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import net.minecraft.client.input.CharInput;
import net.minecraft.client.input.KeyInput;
import org.lwjgl.glfw.GLFW;

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
    private static final int TAB_MACROS  = 2;
    private int activeTab = TAB_GENERAL;

    // UI tracking
    private final List<ClickArea> clickAreas = new ArrayList<>();
    private int panelX, panelY, panelW, panelH;
    private int scrollOffset = 0;
    private int contentHeight = 0;

    // Expanded mod sub-settings
    private boolean hitboxExpanded  = false;
    private boolean waypointExpanded = false;
    private boolean crosshairExpanded = false;

    // Macro editing state
    private int waitingForKeyMacroIndex = -1; // which macro is waiting for key input
    private int editingMacroIndex = -1; // which macro is being text-edited
    private boolean editingName = false; // true=editing name, false=editing command
    private StringBuilder editBuffer = new StringBuilder();

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
        int tabW = (panelW - 24 - 8) / 3;
        int tabH = 16;
        int tabX = panelX + 12;

        drawTab(ctx, tabX,                    tabY, tabW, tabH, "General", TAB_GENERAL, mouseX, mouseY);
        drawTab(ctx, tabX + tabW + 4,         tabY, tabW, tabH, "Mods",    TAB_MODS,    mouseX, mouseY);
        drawTab(ctx, tabX + (tabW + 4) * 2,   tabY, tabW, tabH, "Macros",  TAB_MACROS,  mouseX, mouseY);

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
        } else if (activeTab == TAB_MODS) {
            y = renderModsTab(ctx, contentX, contentW, y, mouseX, mouseY);
        } else {
            y = renderMacrosTab(ctx, contentX, contentW, y, mouseX, mouseY);
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
        ctx.drawCenteredTextWithShadow(this.textRenderer, "RSHIFT=Menu  K=Bright  C=Zoom  G=Coords  V=Crosshair",
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

        String[][] keys = {
                {"RSHIFT", "Open Settings"},
                {"K", "Toggle Fullbright"},
                {"C", "Hold to Zoom"},
                {"G", "Toggle Coords HUD"},
                {"V", "Toggle Crosshair"},
                {"B", "Add Waypoint"},
                {"H", "Toggle Hitboxes"},
        };
        for (String[] kv : keys) {
            ctx.drawTextWithShadow(this.textRenderer, kv[0], contentX, y, GlassUI.TEXT_PRIMARY);
            ctx.drawTextWithShadow(this.textRenderer, kv[1], contentX + 55, y, GlassUI.TEXT_SECONDARY);
            y += 12;
        }
        y += 8;

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

        // ─ Zoom ───────────────────────────────────────────────────
        addToggle(ctx, contentX, y, contentW, btnH, "Zoom  [C]", config.zoomEnabled, mouseX, mouseY,
                () -> { config.zoomEnabled = !config.zoomEnabled; config.save(); });
        y += 22;

        // ─ Coordinates HUD ────────────────────────────────────────
        addToggle(ctx, contentX, y, contentW, btnH, "Coords HUD  [G]", config.coordsHudEnabled, mouseX, mouseY,
                () -> { config.coordsHudEnabled = !config.coordsHudEnabled; config.save(); });
        y += 22;

        // ─ Custom Crosshair ──────────────────────────────────────
        y = drawModHeader(ctx, contentX, contentW, y, btnH, "Crosshair  [V]", config.customCrosshairEnabled, mouseX, mouseY,
                () -> { config.customCrosshairEnabled = !config.customCrosshairEnabled; config.save(); },
                crosshairExpanded, () -> crosshairExpanded = !crosshairExpanded);
        y += 4;

        if (crosshairExpanded && config.customCrosshairEnabled) {
            int sx = contentX + subIndent;

            // Type selector
            ctx.drawTextWithShadow(this.textRenderer, "Type", sx, y, GlassUI.TEXT_SECONDARY);
            y += 10;
            String[] types = {"plus", "dot", "circle"};
            String[] labels = {"+ Plus", "• Dot", "○ Circle"};
            int typeW = (subW - 8) / 3;
            for (int i = 0; i < types.length; i++) {
                int tx = sx + i * (typeW + 4);
                boolean selected = config.crosshairType.equals(types[i]);
                boolean hovered = mouseX >= tx && mouseX < tx + typeW && mouseY >= y && mouseY < y + 14;
                ctx.fill(tx, y, tx + typeW, y + 14, selected ? 0x44FFFFFF : (hovered ? 0x22FFFFFF : 0x11FFFFFF));
                ctx.drawCenteredTextWithShadow(this.textRenderer, labels[i], tx + typeW / 2, y + 3,
                        selected ? GlassUI.TEXT_PRIMARY : GlassUI.TEXT_SECONDARY);
                final String type = types[i];
                clickAreas.add(new ClickArea(tx, y, typeW, 14, () -> { config.crosshairType = type; config.save(); }));
            }
            y += 20;

            // Size slider
            y = drawSliderRow(ctx, sx, y, subW, "Size", config.crosshairSize, 2, 20, mouseX, mouseY,
                    val -> { config.crosshairSize = val; config.save(); }, config.crosshairSize + "px");
            y += 6;

            // Thickness slider
            y = drawSliderRow(ctx, sx, y, subW, "Thickness", config.crosshairThickness, 1, 6, mouseX, mouseY,
                    val -> { config.crosshairThickness = val; config.save(); }, config.crosshairThickness + "px");
            y += 6;

            // Gap slider
            y = drawSliderRow(ctx, sx, y, subW, "Gap", config.crosshairGap, 0, 10, mouseX, mouseY,
                    val -> { config.crosshairGap = val; config.save(); }, config.crosshairGap + "px");
            y += 6;

            // Color presets
            ctx.drawTextWithShadow(this.textRenderer, "Color", sx, y, GlassUI.TEXT_SECONDARY);
            y += 10;
            int[] colors = { 0xFFFFFFFF, 0xFFFF4444, 0xFF44FF88, 0xFF4488FF, 0xFFFFFF44, 0xFFFF44FF };
            int cbSize = 12;
            int cbSpacing = 18;
            for (int i = 0; i < colors.length; i++) {
                int cbX = sx + i * cbSpacing;
                int cbY = y;
                ctx.fill(cbX, cbY, cbX + cbSize, cbY + cbSize, colors[i]);
                float[] rgb = hexToRgb(colors[i]);
                boolean sel = Math.abs(config.crosshairRed - rgb[0]) < 0.05f
                        && Math.abs(config.crosshairGreen - rgb[1]) < 0.05f
                        && Math.abs(config.crosshairBlue - rgb[2]) < 0.05f;
                if (sel) {
                    ctx.fill(cbX - 1, cbY - 1, cbX + cbSize + 1, cbY + cbSize + 1, 0x66FFFFFF);
                    ctx.fill(cbX, cbY, cbX + cbSize, cbY + cbSize, colors[i]);
                }
                final float[] frgb = rgb;
                clickAreas.add(new ClickArea(cbX, cbY, cbSize, cbSize, () -> {
                    config.crosshairRed = frgb[0]; config.crosshairGreen = frgb[1]; config.crosshairBlue = frgb[2];
                    config.save();
                }));
            }
            y += cbSize + 8;
        }
        y += 4;

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

    // ── Macros Tab ────────────────────────────────────────────────

    private int renderMacrosTab(DrawContext ctx, int contentX, int contentW, int y, int mouseX, int mouseY) {
        int btnH = 18;

        // Master toggle
        addToggle(ctx, contentX, y, contentW, btnH, "Macros Enabled", config.macrosEnabled, mouseX, mouseY,
                () -> { config.macrosEnabled = !config.macrosEnabled; config.save(); });
        y += 24;

        if (!config.macrosEnabled) {
            ctx.drawTextWithShadow(this.textRenderer, "Enable macros to configure", contentX, y, GlassUI.TEXT_MUTED);
            return y + 20;
        }

        // Macro list
        for (int i = 0; i < config.macros.size(); i++) {
            KiritConfig.MacroEntry macro = config.macros.get(i);
            int rowY = y;
            int rowH = 32;

            // Layout constants
            int keyBtnW = 50;
            int keyBtnX = contentX + contentW - keyBtnW - 22;
            int nameAreaW = contentW - keyBtnW - 30;

            // Background
            boolean hovered = mouseX >= contentX && mouseX < contentX + contentW
                    && mouseY >= rowY && mouseY < rowY + rowH;
            ctx.fill(contentX, rowY, contentX + contentW, rowY + rowH, hovered ? 0x18FFFFFF : 0x0CFFFFFF);

            // Name (clickable to edit)
            boolean editingThisName = (editingMacroIndex == i && editingName);
            String nameDisplay = editingThisName ? editBuffer.toString() + "_"
                    : (macro.name.isEmpty() ? "Macro " + (i + 1) : macro.name);
            int nameColor = editingThisName ? 0xFFFFFF44 : GlassUI.TEXT_PRIMARY;
            ctx.drawTextWithShadow(this.textRenderer, nameDisplay, contentX + 4, rowY + 3, nameColor);
            final int nameIdx = i;
            clickAreas.add(new ClickArea(contentX, rowY, nameAreaW, 12, () -> {
                editingMacroIndex = nameIdx;
                editingName = true;
                editBuffer = new StringBuilder(config.macros.get(nameIdx).name);
                waitingForKeyMacroIndex = -1;
            }));

            // Command (clickable to edit)
            boolean editingThisCmd = (editingMacroIndex == i && !editingName);
            String cmdDisplay = editingThisCmd ? editBuffer.toString() + "_"
                    : (macro.command.isEmpty() ? "(no command)" : macro.command);
            if (!editingThisCmd && cmdDisplay.length() > 25) cmdDisplay = cmdDisplay.substring(0, 25) + "...";
            int cmdColor = editingThisCmd ? 0xFFFFFF44 : GlassUI.TEXT_SECONDARY;
            ctx.drawTextWithShadow(this.textRenderer, cmdDisplay, contentX + 4, rowY + 14, cmdColor);
            clickAreas.add(new ClickArea(contentX, rowY + 12, nameAreaW, 12, () -> {
                editingMacroIndex = nameIdx;
                editingName = false;
                editBuffer = new StringBuilder(config.macros.get(nameIdx).command);
                waitingForKeyMacroIndex = -1;
            }));
            boolean isWaiting = (waitingForKeyMacroIndex == i);
            String keyText = isWaiting ? "..." : getKeyName(macro.keyCode);
            ctx.fill(keyBtnX, rowY + 4, keyBtnX + keyBtnW, rowY + 4 + 14,
                    isWaiting ? 0x44FFFF44 : 0x22FFFFFF);
            ctx.drawCenteredTextWithShadow(this.textRenderer, keyText,
                    keyBtnX + keyBtnW / 2, rowY + 7, isWaiting ? 0xFFFFFF44 : GlassUI.TEXT_PRIMARY);

            final int idx = i;
            clickAreas.add(new ClickArea(keyBtnX, rowY + 4, keyBtnW, 14, () -> {
                waitingForKeyMacroIndex = idx;
            }));

            // Delete button (X)
            int delX = contentX + contentW - 18;
            ctx.fill(delX, rowY + 4, delX + 14, rowY + 4 + 14, 0x22FF4444);
            ctx.drawCenteredTextWithShadow(this.textRenderer, "X", delX + 7, rowY + 7, 0xFFFF4444);
            clickAreas.add(new ClickArea(delX, rowY + 4, 14, 14, () -> {
                config.macros.remove(idx);
                config.save();
                if (waitingForKeyMacroIndex == idx) waitingForKeyMacroIndex = -1;
                else if (waitingForKeyMacroIndex > idx) waitingForKeyMacroIndex--;
            }));

            y += rowH + 2;
        }

        // Add button
        y += 4;
        GlassUI.drawButton(ctx, contentX, y, contentW, btnH, mouseX, mouseY, false);
        ctx.drawCenteredTextWithShadow(this.textRenderer, "+ Add Macro", contentX + contentW / 2, y + 5, GlassUI.TEXT_PRIMARY);
        clickAreas.add(new ClickArea(contentX, y, contentW, btnH, () -> {
            config.macros.add(new KiritConfig.MacroEntry("", "/help", -1));
            config.save();
        }));
        y += 24;

        // Help text
        ctx.drawTextWithShadow(this.textRenderer, "Click key button, then press", contentX, y, GlassUI.TEXT_MUTED);
        y += 10;
        ctx.drawTextWithShadow(this.textRenderer, "a key to bind. Commands", contentX, y, GlassUI.TEXT_MUTED);
        y += 10;
        ctx.drawTextWithShadow(this.textRenderer, "start with / for slash cmds.", contentX, y, GlassUI.TEXT_MUTED);
        y += 16;

        return y;
    }

    private String getKeyName(int keyCode) {
        if (keyCode < 0) return "None";
        String name = GLFW.glfwGetKeyName(keyCode, 0);
        if (name != null) return name.toUpperCase();
        // Named keys
        return switch (keyCode) {
            case GLFW.GLFW_KEY_F1 -> "F1";
            case GLFW.GLFW_KEY_F2 -> "F2";
            case GLFW.GLFW_KEY_F3 -> "F3";
            case GLFW.GLFW_KEY_F4 -> "F4";
            case GLFW.GLFW_KEY_F5 -> "F5";
            case GLFW.GLFW_KEY_F6 -> "F6";
            case GLFW.GLFW_KEY_F7 -> "F7";
            case GLFW.GLFW_KEY_F8 -> "F8";
            case GLFW.GLFW_KEY_F9 -> "F9";
            case GLFW.GLFW_KEY_F10 -> "F10";
            case GLFW.GLFW_KEY_F11 -> "F11";
            case GLFW.GLFW_KEY_F12 -> "F12";
            case GLFW.GLFW_KEY_KP_0 -> "NUM0";
            case GLFW.GLFW_KEY_KP_1 -> "NUM1";
            case GLFW.GLFW_KEY_KP_2 -> "NUM2";
            case GLFW.GLFW_KEY_KP_3 -> "NUM3";
            case GLFW.GLFW_KEY_KP_4 -> "NUM4";
            case GLFW.GLFW_KEY_KP_5 -> "NUM5";
            case GLFW.GLFW_KEY_KP_6 -> "NUM6";
            case GLFW.GLFW_KEY_KP_7 -> "NUM7";
            case GLFW.GLFW_KEY_KP_8 -> "NUM8";
            case GLFW.GLFW_KEY_KP_9 -> "NUM9";
            default -> "KEY" + keyCode;
        };
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
    public boolean keyPressed(KeyInput keyInput) {
        int keyCode = keyInput.key();
        // Text editing mode
        if (editingMacroIndex >= 0 && editingMacroIndex < config.macros.size()) {
            if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                editingMacroIndex = -1;
                return true;
            }
            if (keyCode == GLFW.GLFW_KEY_ENTER || keyCode == GLFW.GLFW_KEY_KP_ENTER) {
                KiritConfig.MacroEntry macro = config.macros.get(editingMacroIndex);
                if (editingName) {
                    macro.name = editBuffer.toString();
                } else {
                    macro.command = editBuffer.toString();
                }
                config.save();
                editingMacroIndex = -1;
                return true;
            }
            if (keyCode == GLFW.GLFW_KEY_BACKSPACE && editBuffer.length() > 0) {
                editBuffer.deleteCharAt(editBuffer.length() - 1);
                return true;
            }
            return true;
        }

        // Key binding mode
        if (waitingForKeyMacroIndex >= 0 && waitingForKeyMacroIndex < config.macros.size()) {
            if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                waitingForKeyMacroIndex = -1;
                return true;
            }
            config.macros.get(waitingForKeyMacroIndex).keyCode = keyCode;
            config.save();
            waitingForKeyMacroIndex = -1;
            return true;
        }
        return super.keyPressed(keyInput);
    }

    @Override
    public boolean charTyped(CharInput charInput) {
        if (editingMacroIndex >= 0 && editBuffer.length() < 50 && charInput.isValidChar()) {
            editBuffer.appendCodePoint(charInput.codepoint());
            return true;
        }
        return super.charTyped(charInput);
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
