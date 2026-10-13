/**
 * Direct Telegram Test Script
 * Tests Telegram bot integration with multiple recipients
 * 
 * Usage: node test-telegram-direct.cjs
 */

// Multiple Chat IDs (you + friend)
const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';  // Get from @BotFather
const CHAT_IDS = ['YOUR_CHAT_ID_1', 'YOUR_CHAT_ID_2'];  // Add your chat IDs

console.log('🤖 Testing Telegram Multiple Recipients...\n');
console.log('Bot Token:', BOT_TOKEN.substring(0, 20) + '...');
console.log('Recipients:', CHAT_IDS.length);
console.log('Chat IDs:', CHAT_IDS.join(', '));
console.log('\n---\n');

if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || CHAT_IDS.length === 0) {
  console.error('❌ ERROR: Please update BOT_TOKEN and CHAT_IDS in the script!');
  console.error('\n📝 Steps:');
  console.error('1. Open Telegram');
  console.error('2. Search for @BotFather');
  console.error('3. Send: /newbot');
  console.error('4. Follow instructions');
  console.error('5. Copy BOT_TOKEN');
  console.error('6. Get CHAT_ID from: https://api.telegram.org/bot<TOKEN>/getUpdates');
  console.error('7. Update this file with both values');
  process.exit(1);
}

const message = `🚨 *POLE GUARDIAN ALERT - TEST*

📍 *Pole:* Pole-Rajwada-01
⚡ *Fault:* LEAKAGE CURRENT
📊 *Value:* 30.50 mA
🔴 *Status:* CRITICAL

⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
🔧 *Action Required:* Immediate inspection needed

_Powered by Tesla Pulse IoT System_`;

const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// Send to all recipients
Promise.all(
  CHAT_IDS.map((chatId) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          console.log(`✅ SUCCESS! Message sent to ${chatId}`);
          console.log(`   Message ID: ${data.result.message_id}`);
        } else {
          console.error(`❌ ERROR for ${chatId}:`, data.description);
        }
      })
      .catch((error) => {
        console.error(`❌ NETWORK ERROR for ${chatId}:`, error.message);
      })
  )
).then(() => {
  console.log(`\n📱 Check Telegram app now! Sent to ${CHAT_IDS.length} recipient(s).`);
  console.log('\nMessage preview:');
  console.log('---');
  console.log(message.replace(/\*/g, ''));
});
