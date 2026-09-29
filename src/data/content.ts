/**
 * Работа с неподтверждёнными данными.
 *
 * Часть фактов о поездке организатор ещё не подтвердил: цена, состав,
 * размер группы, отели, отзывы. Такие поля помечаются значением TODO_CONTENT,
 * и компоненты обязаны их скрывать, а не показывать выдуманное.
 *
 * Полный список недостающего — в CONTENT_NEEDED.md.
 */

export const TODO_CONTENT = '__TODO_CONTENT__' as const;
export type TodoContent = typeof TODO_CONTENT;

/** Значение, которое ещё предстоит получить от организатора. */
export type Pending<T> = T | TodoContent;

/** true, если значение подтверждено и его можно показывать. */
export function isReady<T>(value: Pending<T>): value is T {
  return value !== TODO_CONTENT;
}

/** Оставляет только подтверждённые значения. */
export function onlyReady<T>(values: readonly Pending<T>[]): T[] {
  return values.filter(isReady);
}
