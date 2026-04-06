package dev.imkirit.client.feature;

import dev.imkirit.client.KiritClientMod;

/**
 * Custom hitbox rendering with color, health indicator and better visibility.
 * Rendering implementation will be updated for current MC version.
 */
public class HitboxRenderer {

    public boolean shouldRender() {
        return KiritClientMod.getInstance().getConfig().hitboxesEnabled;
    }
}
