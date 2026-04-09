package dev.imkirit.client.feature;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.MinecraftClient;

/**
 * Zoom feature — reduces FOV while the zoom key is held.
 */
public class ZoomManager {

    private boolean zooming = false;
    private double originalFov = 70.0;

    public void startZoom(MinecraftClient client) {
        if (!zooming) {
            originalFov = client.options.getFov().getValue();
            zooming = true;
        }
    }

    public void stopZoom(MinecraftClient client) {
        if (zooming) {
            client.options.getFov().setValue((int) originalFov);
            zooming = false;
        }
    }

    public void tick(MinecraftClient client) {
        if (zooming) {
            KiritConfig config = KiritClientMod.getInstance().getConfig();
            int zoomFov = config.zoomFov;
            if (client.options.getFov().getValue() != zoomFov) {
                client.options.getFov().setValue(zoomFov);
            }
        }
    }

    public boolean isZooming() {
        return zooming;
    }
}
