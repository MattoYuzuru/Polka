import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  type BookDetails,
  type BooksImportPayload,
  type BooksImportResponse,
  type CoverUploadResponse,
  type CreateBookPayload,
  type ReorderBooksPayload,
  type UpdateBookPayload,
} from '../../shared/models/book.model';

@Injectable({ providedIn: 'root' })
export class BookApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  createBook(payload: CreateBookPayload): Observable<BookDetails> {
    return this.http.post<BookDetails>(`${this.apiBaseUrl}/books`, payload);
  }

  getBook(bookId: string): Observable<BookDetails> {
    return this.http.get<BookDetails>(`${this.apiBaseUrl}/books/${encodeURIComponent(bookId)}`);
  }

  updateBook(bookId: string, payload: UpdateBookPayload): Observable<BookDetails> {
    return this.http.patch<BookDetails>(
      `${this.apiBaseUrl}/books/${encodeURIComponent(bookId)}`,
      payload,
    );
  }

  setBookVisibility(bookId: string, isPublic: boolean): Observable<BookDetails> {
    return this.http.patch<BookDetails>(
      `${this.apiBaseUrl}/books/${encodeURIComponent(bookId)}/visibility`,
      { isPublic },
    );
  }

  deleteBook(bookId: string): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(
      `${this.apiBaseUrl}/books/${encodeURIComponent(bookId)}`,
    );
  }

  reorderBooks(payload: ReorderBooksPayload): Observable<{ status: string }> {
    return this.http.patch<{ status: string }>(`${this.apiBaseUrl}/books/order`, payload);
  }

  uploadCover(file: File): Observable<CoverUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CoverUploadResponse>(`${this.apiBaseUrl}/books/cover-upload`, formData);
  }

  importBooks(payload: BooksImportPayload): Observable<BooksImportResponse> {
    return this.http.post<BooksImportResponse>(`${this.apiBaseUrl}/books/import`, payload);
  }

  getCoverUrl(bookId: string): string {
    return `${this.apiBaseUrl}/books/${encodeURIComponent(bookId)}/cover`;
  }
}
