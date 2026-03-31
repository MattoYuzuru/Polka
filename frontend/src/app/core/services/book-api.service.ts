import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BookDetails, CreateBookPayload } from '../../shared/models/book.model';

@Injectable({ providedIn: 'root' })
export class BookApiService {
  private readonly http = inject(HttpClient);

  createBook(payload: CreateBookPayload): Observable<BookDetails> {
    return this.http.post<BookDetails>(`${environment.apiBaseUrl}/books`, payload);
  }

  getBook(bookId: string): Observable<BookDetails> {
    return this.http.get<BookDetails>(
      `${environment.apiBaseUrl}/books/${encodeURIComponent(bookId)}`,
    );
  }
}
