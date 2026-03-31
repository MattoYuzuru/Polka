import { TestBed } from '@angular/core/testing';

import { AuthSessionStore } from './auth-session.store';

describe('AuthSessionStore', () => {
  const session = {
    token: 'demo-token',
    user: {
      id: 'user-1',
      nickname: 'reader',
      email: 'reader@example.com',
      createdAt: '2024-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    globalThis.localStorage.clear();
  });

  it('hydrates an empty session from storage', () => {
    const store = TestBed.inject(AuthSessionStore);

    store.bootstrap();

    expect(store.hydrated()).toBe(true);
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('hydrates a stored session from localStorage', () => {
    globalThis.localStorage.setItem('polka.auth.token', session.token);
    globalThis.localStorage.setItem('polka.auth.user', JSON.stringify(session.user));
    const store = TestBed.inject(AuthSessionStore);

    store.bootstrap();

    expect(store.token()).toBe(session.token);
    expect(store.user()).toEqual(session.user);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('drops a broken stored user payload', () => {
    globalThis.localStorage.setItem('polka.auth.token', session.token);
    globalThis.localStorage.setItem('polka.auth.user', '{broken-json');
    const store = TestBed.inject(AuthSessionStore);

    store.bootstrap();

    expect(store.token()).toBe(session.token);
    expect(store.user()).toBeNull();
    expect(globalThis.localStorage.getItem('polka.auth.user')).toBeNull();
  });

  it('persists a new session', () => {
    const store = TestBed.inject(AuthSessionStore);

    store.setSession(session);

    expect(store.isAuthenticated()).toBe(true);
    expect(globalThis.localStorage.getItem('polka.auth.token')).toBe(session.token);
    expect(globalThis.localStorage.getItem('polka.auth.user')).toBe(JSON.stringify(session.user));
  });

  it('updates only the stored user payload', () => {
    const store = TestBed.inject(AuthSessionStore);
    const nextUser = {
      ...session.user,
      nickname: 'mattoy',
    };

    store.setSession(session);
    store.updateUser(nextUser);

    expect(store.token()).toBe(session.token);
    expect(store.user()).toEqual(nextUser);
    expect(globalThis.localStorage.getItem('polka.auth.user')).toBe(JSON.stringify(nextUser));
  });

  it('clears the session and removes storage keys', () => {
    const store = TestBed.inject(AuthSessionStore);

    store.setSession(session);
    store.clear();

    expect(store.hydrated()).toBe(true);
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(globalThis.localStorage.getItem('polka.auth.token')).toBeNull();
    expect(globalThis.localStorage.getItem('polka.auth.user')).toBeNull();
  });
});
