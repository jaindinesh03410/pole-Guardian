import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

/** True when the Functions emulator is loading or invoking this code. */
export function isFunctionsEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

// Telegram Bot Secrets
export const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");
export const telegramChatId = defineSecret("TELEGRAM_CHAT_ID");

export const telegramSecrets = [telegramBotToken, telegramChatId];

export interface FaultEventData {
  poleId?: string;
  poleName?: string;
  type?: string;
  severity?: string;
  value?: number;
  unit?: string;
  timestamp?: number;
  resolved?: boolean;
}

function readTelegramCredentials(): { token: string; chatId: string } {
  if (isFunctionsEmulator()) {
    return {
      token: process.env.TELEGRAM_BOT_TOKEN ?? "",
      chatId: process.env.TELEGRAM_CHAT_ID ?? "",
    };
  }

  return {
    token: telegramBotToken.value(),
    chatId: telegramChatId.value(),
  };
}

/**
 * Sends a Telegram alert to multiple recipients
 */
async function sendToMultipleRecipients(
  token: string,
  chatIds: string[],
  message: string
): Promise<void> {
  const promises = chatIds.map(async (chatId) => {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: message,
          parse_mode: "Markdown",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`Failed to send to ${chatId}: ${response.status} - ${errorText}`);
        return;
      }

      const result = await response.json();
      logger.info(`Message sent to ${chatId}, messageId: ${result.result?.message_id}`);
    } catch (err) {
      logger.error(`Error sending to ${chatId}:`, err);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Sends a Telegram alert for a critical, unresolved fault_events document.
 */
export async function sendTelegramAlert(
  data: FaultEventData,
  faultId: string
): Promise<void> {
  logger.info("sendTelegramAlert: new fault_event received", {
    faultId,
    severity: data.severity,
    type: data.type,
    poleName: data.poleName,
  });

  if (data.severity !== "critical") {
    logger.info(
      `sendTelegramAlert: severity="${data.severity}" — skipping (not critical).`
    );
    return;
  }

  if (data.resolved === true) {
    logger.info("sendTelegramAlert: fault already resolved — skipping.");
    return;
  }

  const { token, chatId } = readTelegramCredentials();

  if (!token || !chatId) {
    logger.error(
      "sendTelegramAlert: Telegram credentials missing. " +
        "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local or Firebase secrets."
    );
    return;
  }

  // Parse multiple chat IDs (comma-separated)
  const chatIds = chatId.split(",").map((id) => id.trim()).filter((id) => id.length > 0);

  if (chatIds.length === 0) {
    logger.error("sendTelegramAlert: No valid chat IDs found");
    return;
  }

  const poleName = data.poleName ?? data.poleId ?? "Unknown Pole";
  const faultType = (data.type ?? "UNKNOWN").toUpperCase().replace(/_/g, " ");
  const valueStr =
    data.value !== undefined
      ? `${data.value.toFixed(2)} ${data.unit ?? ""}`.trim()
      : "—";

  const timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

  // Telegram message with beautiful formatting
  const message = `🚨 *POLE GUARDIAN ALERT*

📍 *Pole:* ${poleName}
⚡ *Fault:* ${faultType}
📊 *Value:* ${valueStr}
🔴 *Status:* ${data.severity?.toUpperCase()}

⏰ *Time:* ${timestamp}
🔧 *Action Required:* Immediate inspection needed

_Powered by Tesla Pulse IoT System_`;

  logger.info("sendTelegramAlert: sending alert to multiple recipients", {
    recipients: chatIds.length,
    poleName,
    faultType,
    value: valueStr,
  });

  try {
    await sendToMultipleRecipients(token, chatIds, message);
    logger.info("sendTelegramAlert: alerts sent successfully", {
      faultId,
      recipients: chatIds.length,
    });
  } catch (err) {
    logger.error("sendTelegramAlert: send failed", {
      faultId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
