import { HttpErrorResponse, HttpRequest, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom, throwError } from 'rxjs';

import { AuthSessionStore } from '../stores/auth-session.store';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    globalThis.localStorage.clear();
  });

  it('clears the session after a 401 response', async () => {
    const store = TestBed.inject(AuthSessionStore);
    const request = new HttpRequest('GET', '/api/v1/profiles/me', {
      headers: new HttpHeaders({ Authorization: 'Bearer demo-token' }),
    });

    store.setSession({
      token: 'demo-token',
      user: {
        id: 'user-1',
        nickname: 'mattoy',
        email: 'reader@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    await TestBed.runInInjectionContext(async () => {
      await lastValueFrom(
        apiErrorInterceptor(request, () =>
          throwError(() => new HttpErrorResponse({ status: 401 })),
        ),
      );
    }).catch(() => undefined);

    expect(store.isAuthenticated()).toBe(false);
  });

  it.each(['/api/v1/auth/login', '/outside-api'])(
    'keeps the current session for an unauthenticated 401 from %s',
    async (url) => {
      const store = TestBed.inject(AuthSessionStore);
      store.setSession({
        token: 'current-token',
        user: {
          id: 'user-1',
          nickname: 'reader',
          email: 'reader@example.com',
          createdAt: '2024-01-01',
        },
      });
      await TestBed.runInInjectionContext(() =>
        lastValueFrom(
          apiErrorInterceptor(new HttpRequest('GET', url), () =>
            throwError(() => new HttpErrorResponse({ status: 401 })),
          ),
        ),
      ).catch(() => undefined);
      expect(store.token()).toBe('current-token');
    },
  );

  it('keeps a newly signed-in session when an old request returns 401', async () => {
    const store = TestBed.inject(AuthSessionStore);
    store.setSession({
      token: 'new-token',
      user: {
        id: 'user-1',
        nickname: 'reader',
        email: 'reader@example.com',
        createdAt: '2024-01-01',
      },
    });
    const request = new HttpRequest('GET', '/api/v1/profiles/me', {
      headers: new HttpHeaders({ Authorization: 'Bearer expired-token' }),
    });
    await TestBed.runInInjectionContext(() =>
      lastValueFrom(
        apiErrorInterceptor(request, () =>
          throwError(() => new HttpErrorResponse({ status: 401 })),
        ),
      ),
    ).catch(() => undefined);
    expect(store.token()).toBe('new-token');
  });

  it('keeps the session for non-401 responses', async () => {
    const store = TestBed.inject(AuthSessionStore);
    const request = new HttpRequest('GET', '/api/v1/profiles/me', {
      headers: new HttpHeaders({ Authorization: 'Bearer demo-token' }),
    });

    store.setSession({
      token: 'demo-token',
      user: {
        id: 'user-1',
        nickname: 'mattoy',
        email: 'reader@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    await TestBed.runInInjectionContext(async () => {
      await lastValueFrom(
        apiErrorInterceptor(request, () =>
          throwError(() => new HttpErrorResponse({ status: 500 })),
        ),
      );
    }).catch(() => undefined);

    expect(store.isAuthenticated()).toBe(true);
  });
});
