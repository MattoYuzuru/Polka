import { inject } from '@angular/core';
import { AuthSessionStore } from '../stores/auth-session.store';
import { HttpContextToken, type HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export const SKIP_AUTH_TOKEN = new HttpContextToken<boolean>(() => false);

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthSessionStore);
  store.bootstrap();
  const token = store.token();

  if (
    request.context.get(SKIP_AUTH_TOKEN) ||
    request.url.startsWith(`${environment.apiBaseUrl}/auth/`) ||
    !token ||
    !request.url.startsWith(`${environment.apiBaseUrl}/`)
  ) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
