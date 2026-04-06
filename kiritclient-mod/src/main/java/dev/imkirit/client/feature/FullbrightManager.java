package dev.imkirit.client.feature;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.MinecraftClient;

/**
 * Fullbright — overrides gamma to max when enabled.
 */
public class FullbrightManager {

    private static final double FULLBRIGHT_GAMMA = 16.0;
    private double previousGamma = 1.0;
    private boolean wasEnabled = false;

    public void tick(MinecraftClient client) {
        KiritConfig config = KiritClientMod.getInstance().getConfig();
        boolean enabled = config.fullbrightEnabled;

        if (enabled && !wasEnabled) {
            // Save current gamma and override
            previousGamma = client.options.getGamma().getValue();
            client.options.getGamma().setValue(FULLBRIGHT_GAMMA);
            wasEnabled = true;
        } else if (!enabled && wasEnabled) {
            // Restore previous gamma
            client.options.getGamma().setValue(previousGamma);
            wasEnabled = false;
        } else if (enabled) {
            // Keep it maxed (in case user changed it via MC settings)
            if (client.options.getGamma().getValue() != FULLBRIGHT_GAMMA) {
                client.options.getGamma().setValue(FULLBRIGHT_GAMMA);
            }
        }
    }
}
