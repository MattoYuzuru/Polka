import { BookCard } from './book.model';
import { RecommendationListCard } from './recommendation-list.model';

export interface ProfileStats {
  memberSinceLabel: string;
  booksCount: number;
  completedCount: number;
  recommendationListsCount: number;
}

export interface ReadingWindows {
  completedLast30Days: number;
  completedLast365Days: number;
  averageRating: number;
  publicBooksCount: number;
  privateBooksCount: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface GenreBreakdownItem {
  genre: string;
  count: number;
}

export interface ProfileAnalytics {
  readingWindows: ReadingWindows;
  statusBreakdown: StatusBreakdownItem[];
  genreBreakdown: GenreBreakdownItem[];
}

export interface PublicProfile {
  user: {
    nickname: string;
    displayName: string;
    tagline: string;
    createdAt: string;
  };
  stats: ProfileStats;
  analytics: ProfileAnalytics;
  gradientStops: string[];
  books: BookCard[];
  recommendationLists: RecommendationListCard[];
}

export interface EditableProfile {
  userId: string;
  nickname: string;
  email: string;
  displayName: string;
  tagline: string;
  gradientStops: string[];
  createdAt: string;
}

export interface UpdateProfilePayload {
  nickname: string;
  displayName: string;
  tagline: string;
}
