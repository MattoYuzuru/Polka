export const BOOK_STATUSES = [
  'Жду выхода',
  'Отложил',
  'Забросил',
  'Читаю',
  'Прочитал',
  'Пауза',
  'Хочу',
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export interface BookCard {
  id: string;
  title: string;
  author: string;
  description: string;
  year: number;
  publisher: string;
  ageRating: string;
  genre: string;
  status: BookStatus;
  rating: number | null;
  opinionPreview: string;
  coverPalette: string[];
}
