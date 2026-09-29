/**
 * Аналитика через абстракцию: события уходят в dataLayer / gtag / Метрику,
 * только если счётчик реально подключён в Base.astro. Сам по себе никакой
 * внешний трекер не загружается.
 */

export type AnalyticsEvent =
  | 'hero_cta_click'
  | 'route_cta_click'
  | 'price_cta_click'
  | 'program_day_open'
  | 'photo_open'
  | 'lead_form_start'
  | 'lead_form_submit'
  | 'lead_form_success'
  | 'lead_form_error'
  | 'lead_form_telegram_handoff'
  | 'telegram_click';

type Payload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Payload[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...payload });
  if (typeof window.gtag === 'function') window.gtag('event', event, payload);
  if (import.meta.env.DEV) console.debug('[analytics]', event, payload);
}

/** Навешивает отправку событий на элементы с data-analytics. */
export function bindAnalytics(): void {
  document.querySelectorAll<HTMLElement>('[data-analytics]').forEach((el) => {
    el.addEventListener('click', () => track(el.dataset.analytics as AnalyticsEvent));
  });
}
