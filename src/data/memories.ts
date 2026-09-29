/**
 * «Как это было» — фотографии и отзывы с прошлой поездки в Китай.
 *
 * Материалы передаёт организатор. Пока списки пусты, секция на сайт не выводится:
 * пустой блок или выдуманные отзывы хуже, чем их отсутствие.
 *
 * Как добавить:
 *   1. положите фото в src/assets/photos/, например past-china-01.jpg;
 *   2. допишите его в photos: { image: 'past-china-01', alt: 'что на снимке' };
 *   3. отзывы — в reviews: имя, город или род занятий, текст, по желанию фото автора.
 */

export interface MemoryPhoto {
  image: string;
  alt: string;
  /** Широкий кадр на всю строку сетки. */
  wide?: boolean;
}

export interface Review {
  name: string;
  about?: string;
  text: string;
  /** Ключ фото автора в src/assets/photos, если есть. */
  photo?: string;
}

export const memoriesSection = {
  title: 'Как это было',
  lead: 'Кадры и слова участников нашей прошлой поездки в Китай.',
} as const;

export const memoryPhotos: readonly MemoryPhoto[] = [];

export const reviews: readonly Review[] = [];
