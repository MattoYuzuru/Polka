import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('adds the bearer token to API requests', (done) => {
    globalThis.localStorage.setItem('polka.auth.token', 'demo-token');
    const request = new HttpRequest('GET', '/api/v1/profiles/mattoy');

    authTokenInterceptor(request, (nextRequest) => {
      expect(nextRequest.headers.get('Authorization')).toBe('Bearer demo-token');

      return of(new HttpResponse({ status: 200 }));
    }).subscribe(() => done());
  });

  it('skips non-API requests', (done) => {
    globalThis.localStorage.setItem('polka.auth.token', 'demo-token');
    const request = new HttpRequest('GET', '/assets/logo.svg');

    authTokenInterceptor(request, (nextRequest) => {
      expect(nextRequest.headers.has('Authorization')).toBe(false);

      return of(new HttpResponse({ status: 200 }));
    }).subscribe(() => done());
  });

  it('skips API requests when the token is missing', (done) => {
    const request = new HttpRequest('GET', '/api/v1/profiles/mattoy');

    authTokenInterceptor(request, (nextRequest) => {
      expect(nextRequest.headers.has('Authorization')).toBe(false);

      return of(new HttpResponse({ status: 200 }));
    }).subscribe(() => done());
  });
});
