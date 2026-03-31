import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthSession, LoginPayload } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${environment.apiBaseUrl}/auth/login`, payload);
  }
}
