/**
 * Отправка заявки.
 *
 * Адрес приёмника — переменная окружения PUBLIC_LEAD_FORM_ENDPOINT (через trip.formEndpoint).
 * Если она не задана, форма не ломается: в разработке пишет заявку в консоль,
 * а на сайте передаёт её готовым сообщением в Telegram организатора.
 *
 * Никаких ключей на фронтенде: вебхук — это приёмник, который сам решает,
 * что делать с заявкой (Telegram-бот, Google-таблица, CRM).
 */

export interface Lead {
  name: string;
  contact: string;
  email?: string;
  comment?: string;
  source: string;
  page: string;
  referrer: string;
  utm?: Record<string, string>;
}

/** Короткое читаемое сообщение для передачи заявки в Telegram. */
export function buildTelegramLeadUrl(lead: Lead, telegramUrl = 'https://t.me/vsemaya'): string {
  const lines = [
    `Новая заявка: ${lead.source}`,
    '',
    `Имя: ${lead.name}`,
    `Контакт: ${lead.contact}`,
    lead.email ? `Email: ${lead.email}` : '',
    lead.comment ? `Комментарий: ${lead.comment}` : '',
    '',
    `Страница: ${lead.page}`,
  ].filter(Boolean);
  const separator = telegramUrl.includes('?') ? '&' : '?';
  return `${telegramUrl}${separator}text=${encodeURIComponent(lines.join('\n'))}`;
}

/** utm_* из адресной строки — читаем при отправке. */
export function collectUtm(search: string = location.search): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (key.startsWith('utm_') && value) out[key] = value;
  }
  return out;
}

export type LeadResult = { ok: true; mocked: boolean } | { ok: false; reason: string };

const ENDPOINT = import.meta.env.PUBLIC_LEAD_FORM_ENDPOINT as string | undefined;

export async function submitLead(lead: Lead): Promise<LeadResult> {
  if (!ENDPOINT) {
    if (import.meta.env.DEV) {
      console.info('[lead] PUBLIC_LEAD_FORM_ENDPOINT не задан — заявка не отправлена:', lead);
      return { ok: true, mocked: true };
    }
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    return { ok: true, mocked: false };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
