import { isReady, type Pending } from './content';

/**
 * Проверка готовности контента к публикации.
 *
 * Если обязательное поле не заполнено, сборка печатает понятный список
 * недостающего, а не показывает посетителю заглушку.
 *
 *   — обычная сборка печатает список и продолжает;
 *   — сборка с STRICT_CONTENT=1 падает с тем же списком.
 *
 * Посетителю заглушки не видны в любом случае: за отображение отвечают
 * гейты isReady() и флаги секций, а этот модуль только сообщает, чего не хватает.
 */

export interface RequiredField {
  /** Путь к полю в данных — чтобы сразу знать, что открывать. */
  path: string;
  /** Значение, которое проверяем. */
  value: Pending<unknown> | null | undefined;
  /** Что именно нужно получить и от кого. */
  need: string;
}

/** Поле не заполнено, если это TODO_CONTENT, null, undefined или пустая строка. */
function isMissing(value: RequiredField['value']): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return !isReady(value);
}

/**
 * Проверяет список обязательных полей.
 *
 * Вызывается один раз при загрузке модуля данных, то есть отрабатывает
 * и в dev, и во время `astro build`.
 */
export function checkProductionContent(fields: readonly RequiredField[]): void {
  const missing = fields.filter((f) => isMissing(f.value));
  if (missing.length === 0) return;

  const strict = import.meta.env.STRICT_CONTENT === '1';
  const lines = missing.map((f) => `  • ${f.path} — ${f.need}`);
  const message =
    `\nКонтент не готов к публикации: не заполнено полей — ${missing.length}.\n` +
    lines.join('\n') +
    '\n\nЭти блоки посетителю не показываются (их скрывают гейты isReady).\n' +
    'Полный список и формулировки запроса — в CONTENT_NEEDED.md.\n' +
    (strict
      ? 'Сборка остановлена, потому что задан STRICT_CONTENT=1.\n'
      : 'Сборка продолжена. Чтобы запретить релиз без этих данных, соберите с STRICT_CONTENT=1.\n');

  if (strict) throw new Error(message);
  console.warn(message);
}
