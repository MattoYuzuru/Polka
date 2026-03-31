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
  rankPosition: number;
  title: string;
  author: string;
  description: string;
  year: number;
  publisher: string;
  ageRating: string;
  genre: string;
  isPublic: boolean;
  status: BookStatus;
  rating: number | null;
  opinionPreview: string;
  coverPalette: string[];
}

export interface ReorderBooksPayload {
  bookIds: string[];
}

export interface BookFormValue {
  title: string;
  author: string;
  description: string;
  year: number;
  publisher: string;
  ageRating: string;
  genre: string;
  isPublic: boolean;
  status: BookStatus;
  rating: number | null;
  opinion: string;
  quote: string;
}

export interface BookQuote {
  id: string;
  content: string;
  createdAt: string;
}

export interface BookOpinion {
  id: string;
  content: string;
  createdAt: string;
}

export interface BookDetails {
  id: string;
  ownerId: string;
  ownerNickname: string;
  title: string;
  author: string;
  description: string;
  year: number;
  publisher: string;
  ageRating: string;
  genre: string;
  isPublic: boolean;
  status: BookStatus;
  rating: number | null;
  opinionPreview: string;
  coverPalette: string[];
  viewerCanEdit: boolean;
  createdAt: string;
  quotes: BookQuote[];
  opinions: BookOpinion[];
}

export interface CreateBookPayload {
  title: string;
  author: string;
  description: string;
  year: number;
  publisher: string;
  ageRating: string;
  genre: string;
  isPublic: boolean;
  status: BookStatus;
  rating: number | null;
  opinion: string;
  quote: string;
}

export type UpdateBookPayload = CreateBookPayload;
