import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  type EditableProfile,
  type PublicProfile,
  type UpdateProfilePayload,
} from '../../shared/models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  getPublicProfile(nickname: string): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(
      `${environment.apiBaseUrl}/profiles/${encodeURIComponent(nickname)}`,
    );
  }

  getEditableProfile(): Observable<EditableProfile> {
    return this.http.get<EditableProfile>(`${environment.apiBaseUrl}/profiles/me`);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<EditableProfile> {
    return this.http.patch<EditableProfile>(`${environment.apiBaseUrl}/profiles/me`, payload);
  }
}
