import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PublicProfile } from '../../shared/models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  getPublicProfile(nickname: string): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(
      `${environment.apiBaseUrl}/profiles/${encodeURIComponent(nickname)}`,
    );
  }
}
