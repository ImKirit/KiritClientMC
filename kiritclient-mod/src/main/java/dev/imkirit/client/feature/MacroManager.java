package dev.imkirit.client.feature;

import dev.imkirit.client.KiritClientMod;
import dev.imkirit.client.KiritConfig;
import net.minecraft.client.MinecraftClient;
import org.lwjgl.glfw.GLFW;

import java.util.HashSet;
import java.util.Set;

/**
 * Handles custom macros: keybind → chat/command execution.
 * Keys are polled directly via GLFW to avoid registering dynamic keybinds.
 */
public class MacroManager {

    private final Set<Integer> pressedKeys = new HashSet<>();

    public void tick(MinecraftClient client) {
        if (client.player == null || client.currentScreen != null) return;

        KiritConfig config = KiritClientMod.getInstance().getConfig();
        if (!config.macrosEnabled) return;

        long window = client.getWindow().getHandle();

        for (KiritConfig.MacroEntry macro : config.macros) {
            if (macro.keyCode < 0 || macro.command.isEmpty()) continue;

            boolean isDown = GLFW.glfwGetKey(window, macro.keyCode) == GLFW.GLFW_PRESS;

            if (isDown && !pressedKeys.contains(macro.keyCode)) {
                // Key just pressed
                pressedKeys.add(macro.keyCode);
                executeMacro(client, macro);
            } else if (!isDown) {
                pressedKeys.remove(macro.keyCode);
            }
        }
    }

    private void executeMacro(MinecraftClient client, KiritConfig.MacroEntry macro) {
        String cmd = macro.command.trim();
        if (cmd.isEmpty()) return;

        if (cmd.startsWith("/")) {
            // Send as command (without the /)
            client.player.networkHandler.sendChatCommand(cmd.substring(1));
        } else {
            // Send as chat message
            client.player.networkHandler.sendChatMessage(cmd);
        }
        KiritClientMod.LOGGER.info("[KiritClient] Macro '{}' executed: {}", macro.name, cmd);
    }
}
