import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthSessionStore } from '../stores/auth-session.store';
import { of } from 'rxjs';

import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    globalThis.localStorage.clear();
  });

  it('adds the bearer token to API requests', (done) => {
    TestBed.inject(AuthSessionStore).setSession({
      token: 'demo-token',
      user: {
        id: 'user-1',
        nickname: 'reader',
        email: 'reader@example.com',
        createdAt: '2024-01-01',
      },
    });
    const request = new HttpRequest('GET', '/api/v1/profiles/mattoy');

    TestBed.runInInjectionContext(() =>
      authTokenInterceptor(request, (nextRequest) => {
        expect(nextRequest.headers.get('Authorization')).toBe('Bearer demo-token');

        return of(new HttpResponse({ status: 200 }));
      }),
    ).subscribe(() => done());
  });

  it('skips non-API requests', (done) => {
    TestBed.inject(AuthSessionStore).setSession({
      token: 'demo-token',
      user: {
        id: 'user-1',
        nickname: 'reader',
        email: 'reader@example.com',
        createdAt: '2024-01-01',
      },
    });
    const request = new HttpRequest('GET', '/assets/logo.svg');

    TestBed.runInInjectionContext(() =>
      authTokenInterceptor(request, (nextRequest) => {
        expect(nextRequest.headers.has('Authorization')).toBe(false);

        return of(new HttpResponse({ status: 200 }));
      }),
    ).subscribe(() => done());
  });

  it.each(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1-untrusted/cover'])(
    'skips credentials for %s',
    (url) => {
      TestBed.inject(AuthSessionStore).setSession({
        token: 'demo-token',
        user: {
          id: 'user-1',
          nickname: 'reader',
          email: 'reader@example.com',
          createdAt: '2024-01-01',
        },
      });
      TestBed.runInInjectionContext(() =>
        authTokenInterceptor(new HttpRequest('POST', url, {}), (request) => {
          expect(request.headers.has('Authorization')).toBe(false);
          return of(new HttpResponse({ status: 200 }));
        }),
      ).subscribe();
    },
  );

  it('skips API requests when the token is missing', (done) => {
    const request = new HttpRequest('GET', '/api/v1/profiles/mattoy');

    TestBed.runInInjectionContext(() =>
      authTokenInterceptor(request, (nextRequest) => {
        expect(nextRequest.headers.has('Authorization')).toBe(false);

        return of(new HttpResponse({ status: 200 }));
      }),
    ).subscribe(() => done());
  });
});
