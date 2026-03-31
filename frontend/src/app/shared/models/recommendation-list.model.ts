export interface RecommendationListCard {
  id: string;
  title: string;
  description: string;
  booksCount: number;
  isPublic: boolean;
}

export interface RecommendationListBook {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: string;
  rating: number | null;
  isPublic: boolean;
  coverPalette: string[];
}

export interface RecommendationListDetails {
  id: string;
  ownerId: string;
  ownerNickname: string;
  title: string;
  description: string;
  isPublic: boolean;
  booksCount: number;
  viewerCanEdit: boolean;
  createdAt: string;
  updatedAt: string;
  books: RecommendationListBook[];
}

export interface RecommendationListFormValue {
  title: string;
  description: string;
  isPublic: boolean;
  bookIds: string[];
}

export type CreateRecommendationListPayload = RecommendationListFormValue;
export type UpdateRecommendationListPayload = RecommendationListFormValue;
