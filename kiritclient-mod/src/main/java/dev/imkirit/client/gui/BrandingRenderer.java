package dev.imkirit.client.gui;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gl.RenderPipelines;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.util.Identifier;

/**
 * Renders the KiritClient branding (stacked "Kirit" / "Client" + logo)
 * in the bottom-right corner. Used by both HUD and Screen mixins.
 */
public class BrandingRenderer {

    private static final Identifier LOGO_TEXTURE = Identifier.of("kiritclient", "textures/gui/logo.png");
    private static final int LOGO_SIZE = 20;
    private static final int PADDING = 6;
    private static final int TEXT_COLOR = 0xAAFFFFFF;

    public static void render(DrawContext context, int screenWidth, int screenHeight) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.textRenderer == null) return;

        String line1 = "Kirit";
        String line2 = "Client";

        int line1Width = client.textRenderer.getWidth(line1);
        int line2Width = client.textRenderer.getWidth(line2);
        int textBlockWidth = Math.max(line1Width, line2Width);
        int lineHeight = client.textRenderer.fontHeight;

        // Position: bottom-right with padding
        // Layout: [Logo] [Text block]
        int totalWidth = LOGO_SIZE + 4 + textBlockWidth;
        int startX = screenWidth - totalWidth - PADDING;
        int textY1 = screenHeight - PADDING - lineHeight * 2 - 2;
        int textY2 = textY1 + lineHeight + 2;

        // Logo (left of text, vertically centered with text block)
        int logoX = startX;
        int textBlockHeight = lineHeight * 2 + 2;
        int logoY = textY1 + (textBlockHeight - LOGO_SIZE) / 2;

        // Draw logo texture
        context.drawTexture(RenderPipelines.GUI_TEXTURED, LOGO_TEXTURE,
                logoX, logoY, 0f, 0f, LOGO_SIZE, LOGO_SIZE, LOGO_SIZE, LOGO_SIZE);

        // Draw stacked text (right of logo)
        int textX = logoX + LOGO_SIZE + 4;
        context.drawTextWithShadow(client.textRenderer, line1, textX, textY1, TEXT_COLOR);
        context.drawTextWithShadow(client.textRenderer, line2, textX, textY2, TEXT_COLOR);
    }
}
