import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateRecommendationListPayload,
  RecommendationListDetails,
} from '../../shared/models/recommendation-list.model';

@Injectable({ providedIn: 'root' })
export class RecommendationListApiService {
  private readonly http = inject(HttpClient);

  createList(payload: CreateRecommendationListPayload): Observable<RecommendationListDetails> {
    return this.http.post<RecommendationListDetails>(
      `${environment.apiBaseUrl}/recommendation-lists`,
      payload,
    );
  }

  getList(listId: string): Observable<RecommendationListDetails> {
    return this.http.get<RecommendationListDetails>(
      `${environment.apiBaseUrl}/recommendation-lists/${encodeURIComponent(listId)}`,
    );
  }
}
