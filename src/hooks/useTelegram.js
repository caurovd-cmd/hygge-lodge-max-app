// Sends message via Telegram Bot API
// No CORS issues - Telegram Bot API supports CORS from browser
export async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || "Telegram error");
  return json;
}

export async function testTelegramConnection(botToken, chatId) {
  return sendTelegramMessage(botToken, chatId, "✅ Тест подключения — Hygge Lodge");
}
