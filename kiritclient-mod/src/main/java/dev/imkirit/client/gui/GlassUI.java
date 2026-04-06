package dev.imkirit.client.gui;

import net.minecraft.client.font.TextRenderer;
import net.minecraft.client.gui.DrawContext;

/**
 * Glass/transparent UI rendering helpers.
 * Draws rounded-corner panels and buttons matching the KiritClient website design.
 */
public class GlassUI {

    // Colors matching the client/website design
    public static final int BG_OVERLAY = 0xDD0E0E0E;
    public static final int PANEL_BG = 0x33FFFFFF;
    public static final int PANEL_BORDER = 0x22FFFFFF;
    public static final int BUTTON_BG = 0x1AFFFFFF;
    public static final int BUTTON_HOVER = 0x33FFFFFF;
    public static final int BUTTON_ACTIVE = 0x44FFFFFF;
    public static final int TOGGLE_ON = 0x4400FF88;
    public static final int TOGGLE_OFF = 0x44FF4444;
    public static final int TEXT_PRIMARY = 0xFFFFFFFF;
    public static final int TEXT_SECONDARY = 0xFFA0A0A0;
    public static final int TEXT_MUTED = 0xFF555555;
    public static final int ACCENT = 0xFFFFFFFF;
    public static final int DIVIDER = 0x15FFFFFF;

    /**
     * Draw a glass panel with rounded corners (chamfered 2px).
     */
    public static void drawPanel(DrawContext ctx, int x, int y, int w, int h) {
        int r = 2; // corner radius (chamfer)
        // Main fill
        ctx.fill(x + r, y, x + w - r, y + h, PANEL_BG);
        ctx.fill(x, y + r, x + r, y + h - r, PANEL_BG);
        ctx.fill(x + w - r, y + r, x + w, y + h - r, PANEL_BG);
        // Corner pixels
        ctx.fill(x + 1, y + 1, x + r, y + r, PANEL_BG);
        ctx.fill(x + w - r, y + 1, x + w - 1, y + r, PANEL_BG);
        ctx.fill(x + 1, y + h - r, x + r, y + h - 1, PANEL_BG);
        ctx.fill(x + w - r, y + h - r, x + w - 1, y + h - 1, PANEL_BG);

        // Border
        drawBorder(ctx, x, y, w, h, r, PANEL_BORDER);
    }

    /**
     * Draw a button with glass style. Returns true if hovered.
     */
    public static boolean drawButton(DrawContext ctx, int x, int y, int w, int h, int mouseX, int mouseY, boolean active) {
        boolean hovered = mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
        int bg = active ? BUTTON_ACTIVE : (hovered ? BUTTON_HOVER : BUTTON_BG);
        int r = 2;

        // Fill
        ctx.fill(x + r, y, x + w - r, y + h, bg);
        ctx.fill(x, y + r, x + r, y + h - r, bg);
        ctx.fill(x + w - r, y + r, x + w, y + h - r, bg);
        ctx.fill(x + 1, y + 1, x + r, y + r, bg);
        ctx.fill(x + w - r, y + 1, x + w - 1, y + r, bg);
        ctx.fill(x + 1, y + h - r, x + r, y + h - 1, bg);
        ctx.fill(x + w - r, y + h - r, x + w - 1, y + h - 1, bg);

        // Border
        int border = hovered ? 0x33FFFFFF : 0x18FFFFFF;
        drawBorder(ctx, x, y, w, h, r, border);

        return hovered;
    }

    /**
     * Draw a toggle switch.
     */
    public static boolean drawToggle(DrawContext ctx, TextRenderer tr, int x, int y, int w, int h,
                                      String label, boolean enabled, int mouseX, int mouseY) {
        boolean hovered = drawButton(ctx, x, y, w, h, mouseX, mouseY, false);

        // Toggle indicator (small colored dot)
        int dotSize = 6;
        int dotX = x + 6;
        int dotY = y + (h - dotSize) / 2;
        ctx.fill(dotX, dotY, dotX + dotSize, dotY + dotSize, enabled ? 0xFF44FF88 : 0xFFFF4444);

        // Label
        String text = label + ": " + (enabled ? "ON" : "OFF");
        int textColor = enabled ? TEXT_PRIMARY : TEXT_SECONDARY;
        ctx.drawTextWithShadow(tr, text, x + 16, y + (h - tr.fontHeight) / 2, textColor);

        return hovered;
    }

    /**
     * Draw a section header divider with label.
     */
    public static void drawSectionHeader(DrawContext ctx, TextRenderer tr, int x, int y, int w, String label) {
        int textW = tr.getWidth(label);
        int lineY = y + tr.fontHeight / 2;

        // Left line
        ctx.fill(x, lineY, x + (w - textW) / 2 - 6, lineY + 1, DIVIDER);
        // Right line
        ctx.fill(x + (w + textW) / 2 + 6, lineY, x + w, lineY + 1, DIVIDER);
        // Label
        ctx.drawCenteredTextWithShadow(tr, label, x + w / 2, y, TEXT_MUTED);
    }

    /**
     * Draw a selection item (checkbox-style).
     */
    public static boolean drawSelectionItem(DrawContext ctx, TextRenderer tr, int x, int y, int w, int h,
                                             String label, boolean selected, int mouseX, int mouseY) {
        boolean hovered = mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;

        int bg = hovered ? 0x18FFFFFF : 0x0CFFFFFF;
        ctx.fill(x, y, x + w, y + h, bg);

        // Checkbox
        int cbX = x + 4;
        int cbY = y + (h - 8) / 2;
        ctx.fill(cbX, cbY, cbX + 8, cbY + 8, 0x33FFFFFF);
        if (selected) {
            ctx.fill(cbX + 2, cbY + 2, cbX + 6, cbY + 6, 0xFF44FF88);
        }

        // Label
        ctx.drawTextWithShadow(tr, label, x + 16, y + (h - tr.fontHeight) / 2, selected ? TEXT_PRIMARY : TEXT_SECONDARY);

        return hovered;
    }

    private static void drawBorder(DrawContext ctx, int x, int y, int w, int h, int r, int color) {
        // Top
        ctx.fill(x + r, y, x + w - r, y + 1, color);
        // Bottom
        ctx.fill(x + r, y + h - 1, x + w - r, y + h, color);
        // Left
        ctx.fill(x, y + r, x + 1, y + h - r, color);
        // Right
        ctx.fill(x + w - 1, y + r, x + w, y + h - r, color);
        // Corner pixels
        ctx.fill(x + 1, y + 1, x + r, y + 2, color);
        ctx.fill(x + w - r, y + 1, x + w - 1, y + 2, color);
        ctx.fill(x + 1, y + h - 2, x + r, y + h - 1, color);
        ctx.fill(x + w - r, y + h - 2, x + w - 1, y + h - 1, color);
    }
}
