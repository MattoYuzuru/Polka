import { type BookCard } from '../../../../shared/models/book.model';

import {
  canMoveBook,
  canMoveBookToTop,
  getVisibleBooks,
  hasActiveBookFilters,
  isKnownBookStatus,
  reorderBooks,
} from './profile-books.utils';

const books: BookCard[] = [
  {
    id: 'book-1',
    rankPosition: 1,
    title: '451° по Фаренгейту',
    author: 'Рэй Брэдбери',
    description: 'Антиутопия',
    year: 1953,
    publisher: 'Ballantine Books',
    ageRating: '16+',
    genre: 'Антиутопия',
    isPublic: true,
    status: 'Прочитал',
    rating: 10,
    opinionPreview: 'Тест',
    coverPalette: ['#111111', '#222222'],
    coverUrl: null,
  },
  {
    id: 'book-2',
    rankPosition: 2,
    title: 'Дюна',
    author: 'Фрэнк Герберт',
    description: 'Фантастика',
    year: 1965,
    publisher: 'Chilton Books',
    ageRating: '16+',
    genre: 'Научная фантастика',
    isPublic: true,
    status: 'Читаю',
    rating: 9,
    opinionPreview: 'Тест',
    coverPalette: ['#333333', '#444444'],
    coverUrl: null,
  },
  {
    id: 'book-3',
    rankPosition: 3,
    title: 'Если однажды зимней ночью путник',
    author: 'Итало Кальвино',
    description: 'Постмодернизм',
    year: 1979,
    publisher: 'Einaudi',
    ageRating: '16+',
    genre: 'Постмодернизм',
    isPublic: false,
    status: 'Пауза',
    rating: null,
    opinionPreview: 'Тест',
    coverPalette: ['#555555', '#666666'],
    coverUrl: null,
  },
];

describe('profile books utils', () => {
  it('detects active book filters', () => {
    expect(hasActiveBookFilters('', 'all')).toBe(false);
    expect(hasActiveBookFilters('Дюна', 'all')).toBe(true);
    expect(hasActiveBookFilters('', 'Читаю')).toBe(true);
  });

  it('filters books by search query', () => {
    const visibleBooks = getVisibleBooks(books, {
      searchQuery: 'брэдбери',
      selectedStatus: 'all',
      selectedSort: 'top',
    });

    expect(visibleBooks.map((book) => book.id)).toEqual(['book-1']);
  });

  it('filters books by status', () => {
    const visibleBooks = getVisibleBooks(books, {
      searchQuery: '',
      selectedStatus: 'Читаю',
      selectedSort: 'top',
    });

    expect(visibleBooks.map((book) => book.id)).toEqual(['book-2']);
  });

  it('sorts books by rating and keeps top order as a tiebreaker', () => {
    const visibleBooks = getVisibleBooks(
      [
        ...books,
        {
          ...books[1],
          id: 'book-4',
          rankPosition: 4,
          title: 'Новая книга',
          rating: 9,
        },
      ],
      {
        searchQuery: '',
        selectedStatus: 'all',
        selectedSort: 'rating',
      },
    );

    expect(visibleBooks.map((book) => book.id)).toEqual(['book-1', 'book-2', 'book-4', 'book-3']);
  });

  it('sorts books by year descending', () => {
    const visibleBooks = getVisibleBooks(books, {
      searchQuery: '',
      selectedStatus: 'all',
      selectedSort: 'year',
    });

    expect(visibleBooks.map((book) => book.id)).toEqual(['book-3', 'book-2', 'book-1']);
  });

  it('sorts books by title', () => {
    const visibleBooks = getVisibleBooks(books, {
      searchQuery: '',
      selectedStatus: 'all',
      selectedSort: 'title',
    });

    expect(visibleBooks.map((book) => book.id)).toEqual(['book-1', 'book-2', 'book-3']);
  });

  it('moves a book to the top of the ranking', () => {
    const reorderedBooks = reorderBooks(books, 'book-3', 'top');

    expect(reorderedBooks?.map((book) => book.id)).toEqual(['book-3', 'book-1', 'book-2']);
  });

  it('moves a book down by one position', () => {
    const reorderedBooks = reorderBooks(books, 'book-1', 'down');

    expect(reorderedBooks?.map((book) => book.id)).toEqual(['book-2', 'book-1', 'book-3']);
  });

  it('returns null when reordering is impossible', () => {
    expect(reorderBooks(books, 'missing-book', 'top')).toBeNull();
    expect(reorderBooks(books, 'book-1', 'top')).toBeNull();
    expect(reorderBooks(books, 'book-3', 'down')).toBeNull();
  });

  it('calculates move availability helpers', () => {
    expect(canMoveBook(books, 'book-1', 'up')).toBe(false);
    expect(canMoveBook(books, 'book-2', 'up')).toBe(true);
    expect(canMoveBook(books, 'book-2', 'down')).toBe(true);
    expect(canMoveBookToTop(books, 'book-2')).toBe(true);
    expect(canMoveBookToTop(books, 'book-1')).toBe(false);
  });

  it('validates known book statuses', () => {
    expect(isKnownBookStatus('Прочитал')).toBe(true);
    expect(isKnownBookStatus('Unknown')).toBe(false);
  });
});
