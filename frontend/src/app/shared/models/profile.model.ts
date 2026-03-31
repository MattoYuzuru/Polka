import { BookCard } from './book.model';

export interface ProfileStats {
  memberSinceLabel: string;
  booksCount: number;
  completedCount: number;
  recommendationListsCount: number;
}

export interface RecommendationListCard {
  id: string;
  title: string;
  description: string;
  booksCount: number;
  isPublic: boolean;
}

export interface PublicProfile {
  user: {
    nickname: string;
    displayName: string;
    tagline: string;
    createdAt: string;
  };
  stats: ProfileStats;
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
