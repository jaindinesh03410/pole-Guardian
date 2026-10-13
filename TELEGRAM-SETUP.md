# 🤖 Telegram Bot Setup - Complete Guide

## Step 1: Create Telegram Bot (2 minutes)

1. Open Telegram app on phone/desktop
2. Search for: **@BotFather**
3. Send command: `/newbot`
4. Bot name: `PoleGuardian Alert Bot`
5. Username: `poleguardian_alert_bot` (must end with `bot`)
6. Copy the **BOT TOKEN** (looks like: `7835046315:AAHgXwPexample...`)

---

## Step 2: Get Your Chat ID (1 minute)

1. Search for your new bot in Telegram
2. Start chat: `/start`
3. Open browser: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
4. Replace `<YOUR_BOT_TOKEN>` with token from Step 1
5. Look for `"chat":{"id":123456789` - copy that number
6. Your CHAT_ID: `123456789`

---

## Step 3: Test Bot (30 seconds)

Open browser and visit (replace with your values):
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=Test from PoleGuardian
```

You should receive "Test from PoleGuardian" on Telegram!

---

## Step 4: Configure Project

I'll update the files - you just need to provide:
1. **BOT_TOKEN** from Step 1
2. **CHAT_ID** from Step 2

Give me these two values and I'll configure everything!

---

## Message Format (Beautiful!)

```
🚨 POLE GUARDIAN ALERT

📍 Pole: Rajwada-01
⚡ Fault: LEAKAGE CURRENT
📊 Value: 30.50 mA
🔴 Threshold: 15.00 mA

⏰ Time: 07 Sep 2026, 10:45 PM
🔧 Status: CRITICAL
⚠️ Action Required: Immediate inspection

Powered by Tesla Pulse IoT System
```

---

## Benefits vs WhatsApp

✅ Completely FREE forever
✅ No trial limits
✅ Custom formatting with emojis
✅ Instant delivery
✅ No sandbox needed
✅ Multiple recipients easy
✅ Better formatting options
✅ Works on all devices

---

**Next:** Create bot with @BotFather and give me TOKEN + CHAT_ID!
