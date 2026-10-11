import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthSessionStore } from '../stores/auth-session.store';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const authSessionStore = inject(AuthSessionStore);

  return next(request).pipe(
    tap({
      error: (error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          request.url.startsWith(`${environment.apiBaseUrl}/`) &&
          !request.url.startsWith(`${environment.apiBaseUrl}/auth/`) &&
          request.headers.get('Authorization') === `Bearer ${authSessionStore.token()}`
        ) {
          authSessionStore.clear();
        }
      },
    }),
  );
};
