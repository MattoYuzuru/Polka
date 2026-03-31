import { type HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

const TOKEN_STORAGE_KEY = 'polka.auth.token';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY);

  if (!token || !request.url.startsWith(environment.apiBaseUrl)) {
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
