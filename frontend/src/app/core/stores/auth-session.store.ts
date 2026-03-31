import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { type AuthSession, type UserIdentity } from '../../shared/models/auth.model';

const TOKEN_STORAGE_KEY = 'polka.auth.token';
const USER_STORAGE_KEY = 'polka.auth.user';

interface AuthSessionState {
  hydrated: boolean;
  token: string | null;
  user: UserIdentity | null;
}

const initialState: AuthSessionState = {
  hydrated: false,
  token: null,
  user: null,
};

function readUserFromStorage(): UserIdentity | null {
  const rawValue = globalThis.localStorage?.getItem(USER_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as UserIdentity;
  } catch {
    globalThis.localStorage?.removeItem(USER_STORAGE_KEY);

    return null;
  }
}

export const AuthSessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ token, user }) => ({
    isAuthenticated: computed(() => Boolean(token() && user())),
  })),
  withMethods((store) => ({
    bootstrap(): void {
      if (store.hydrated()) {
        return;
      }

      patchState(store, {
        hydrated: true,
        token: globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY) ?? null,
        user: readUserFromStorage(),
      });
    },
    setSession(session: AuthSession): void {
      globalThis.localStorage?.setItem(TOKEN_STORAGE_KEY, session.token);
      globalThis.localStorage?.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));

      patchState(store, {
        hydrated: true,
        token: session.token,
        user: session.user,
      });
    },
    updateUser(user: UserIdentity): void {
      globalThis.localStorage?.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      patchState(store, {
        user,
      });
    },
    clear(): void {
      globalThis.localStorage?.removeItem(TOKEN_STORAGE_KEY);
      globalThis.localStorage?.removeItem(USER_STORAGE_KEY);

      patchState(store, {
        hydrated: true,
        token: null,
        user: null,
      });
    },
  })),
);
