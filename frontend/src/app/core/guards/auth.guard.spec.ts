import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, type UrlTree } from '@angular/router';

import { AuthSessionStore } from '../stores/auth-session.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    globalThis.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('allows navigation for an authenticated user', () => {
    const store = TestBed.inject(AuthSessionStore);

    store.setSession({
      token: 'demo-token',
      user: {
        id: 'user-1',
        nickname: 'mattoy',
        email: 'reader@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    const result = TestBed.runInInjectionContext(() => authGuard(null as never, null as never));

    expect(result).toBe(true);
  });

  it('redirects guests to the login page', () => {
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => authGuard(null as never, null as never));

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});
