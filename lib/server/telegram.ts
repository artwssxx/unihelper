import "server-only";

/** Сообщение в админ-чат команды. Без TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID — только лог. */
export async function notifyAdmins(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.info("[telegram:demo]", text);
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) console.error("[telegram] send failed", res.status, await res.text());
  return res.ok;
}
