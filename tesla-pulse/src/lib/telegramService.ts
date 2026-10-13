/**
 * telegramService.ts
 *
 * Frontend helper that sends Telegram alerts when a fault is detected
 * Supports multiple recipients via comma-separated Chat IDs
 */

import type { FaultEvent } from '@/types';

// ─── Config — set these in your .env file ────────────────────────────────────
const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;

// Parse multiple chat IDs (comma-separated)
const CHAT_IDS = CHAT_ID?.split(',').map(id => id.trim()).filter(id => id.length > 0) ?? [];

// Minimum severity level that triggers a Telegram message
const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};
const MIN_SEVERITY_RANK = SEVERITY_RANK['medium'];

// Debounce map — prevent duplicate messages
const DEBOUNCE_MS = 60_000; // 1 minute
const _lastSent = new Map<string, number>();

function isDebounced(fault: FaultEvent): boolean {
  const key  = `${fault.poleId}:${fault.type}`;
  const last = _lastSent.get(key) ?? 0;
  if (Date.now() - last < DEBOUNCE_MS) return true;
  _lastSent.set(key, Date.now());
  return false;
}

/**
 * Sends a Telegram alert for the given fault event.
 */
export async function sendTelegramAlert(fault: FaultEvent): Promise<void> {
  if (!BOT_TOKEN || CHAT_IDS.length === 0) {
    console.debug('[Telegram] Not configured - skipping alert');
    return;
  }

  const rank = SEVERITY_RANK[fault.severity] ?? 0;
  if (rank < MIN_SEVERITY_RANK) {
    console.debug(`[Telegram] Skipping alert - severity too low (${fault.severity})`);
    return;
  }

  if (isDebounced(fault)) {
    console.debug(`[Telegram] Debounced alert for ${fault.poleId}:${fault.type}`);
    return;
  }

  const timestamp = new Date(fault.timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const message = `🚨 *POLE GUARDIAN ALERT*

📍 *Pole:* ${fault.poleName}
⚡ *Fault:* ${fault.type.toUpperCase().replace(/_/g, ' ')}
📊 *Value:* ${fault.value.toFixed(2)} ${fault.unit}
🔴 *Status:* ${fault.severity.toUpperCase()}

⏰ *Time:* ${timestamp}
🔧 *Action Required:* Immediate inspection needed

_Powered by Tesla Pulse IoT System_`;

  try {
    // Send to all recipients in parallel
    const promises = CHAT_IDS.map(chatId => sendToRecipient(BOT_TOKEN!, chatId, message));
    await Promise.allSettled(promises);
    
    console.log(`[Telegram] ✅ Alert sent to ${CHAT_IDS.length} recipient(s)`);
  } catch (err) {
    console.warn('[Telegram] Failed to send alert:', err);
  }
}

/**
 * Send message to a single recipient
 */
async function sendToRecipient(token: string, chatId: string, message: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[Telegram] HTTP ${res.status} for ${chatId}:`, text);
      return;
    }

    const json = await res.json().catch(() => ({}));
    console.log(`[Telegram] ✅ Sent to ${chatId} - Message ID: ${json.result?.message_id}`);
  } catch (err) {
    console.warn(`[Telegram] Error sending to ${chatId}:`, err);
  }
}
