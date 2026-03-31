import {
  BOOK_STATUSES,
  type BookCard,
  type BookStatus,
} from '../../../../shared/models/book.model';

export type BookSortOption = 'top' | 'rating' | 'year' | 'title';
export type ReorderDirection = 'top' | 'up' | 'down';

export interface VisibleBooksOptions {
  searchQuery: string;
  selectedStatus: 'all' | BookStatus;
  selectedSort: BookSortOption;
}

export function hasActiveBookFilters(
  searchQuery: string,
  selectedStatus: 'all' | BookStatus,
): boolean {
  return searchQuery.trim() !== '' || selectedStatus !== 'all';
}

export function getVisibleBooks(books: BookCard[], options: VisibleBooksOptions): BookCard[] {
  const normalizedQuery = options.searchQuery.trim().toLowerCase();
  const sortedBooks = [...books].filter((book) => {
    const matchesQuery =
      normalizedQuery === '' ||
      [book.title, book.author, book.genre].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    const matchesStatus =
      options.selectedStatus === 'all' || book.status === options.selectedStatus;

    return matchesQuery && matchesStatus;
  });

  switch (options.selectedSort) {
    case 'rating':
      return sortedBooks.sort(
        (left, right) =>
          (right.rating ?? -1) - (left.rating ?? -1) || left.rankPosition - right.rankPosition,
      );
    case 'year':
      return sortedBooks.sort(
        (left, right) => right.year - left.year || left.rankPosition - right.rankPosition,
      );
    case 'title':
      return sortedBooks.sort(
        (left, right) =>
          left.title.localeCompare(right.title, 'ru') || left.rankPosition - right.rankPosition,
      );
    default:
      return sortedBooks.sort((left, right) => left.rankPosition - right.rankPosition);
  }
}

export function reorderBooks(
  books: BookCard[],
  bookId: string,
  direction: ReorderDirection,
): BookCard[] | null {
  const reorderedBooks = [...books];
  const currentIndex = reorderedBooks.findIndex((book) => book.id === bookId);

  if (currentIndex === -1) {
    return null;
  }

  if (direction === 'top') {
    if (currentIndex === 0) {
      return null;
    }

    const [book] = reorderedBooks.splice(currentIndex, 1);
    reorderedBooks.unshift(book);

    return reorderedBooks;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= reorderedBooks.length) {
    return null;
  }

  [reorderedBooks[currentIndex], reorderedBooks[targetIndex]] = [
    reorderedBooks[targetIndex],
    reorderedBooks[currentIndex],
  ];

  return reorderedBooks;
}

export function canMoveBook(books: BookCard[], bookId: string, direction: 'up' | 'down'): boolean {
  const bookIndex = books.findIndex((book) => book.id === bookId);

  if (bookIndex === -1) {
    return false;
  }

  if (direction === 'up') {
    return bookIndex > 0;
  }

  return bookIndex < books.length - 1;
}

export function canMoveBookToTop(books: BookCard[], bookId: string): boolean {
  return books.findIndex((book) => book.id === bookId) > 0;
}

export function isKnownBookStatus(status: string): status is BookStatus {
  return (BOOK_STATUSES as readonly string[]).includes(status);
}
