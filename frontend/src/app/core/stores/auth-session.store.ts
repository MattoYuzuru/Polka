import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { readLocalValue, writeLocalValue } from '../utils/local-storage';

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
  const rawValue = readLocalValue(USER_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const user: unknown = JSON.parse(rawValue);
    if (
      !user ||
      typeof user !== 'object' ||
      !['id', 'nickname', 'email', 'createdAt'].every(
        (key) =>
          key in user &&
          typeof (user as Record<string, unknown>)[key] === 'string' &&
          (user as Record<string, string>)[key].trim() !== '',
      )
    ) {
      writeLocalValue(USER_STORAGE_KEY, null);
      return null;
    }
    return user as UserIdentity;
  } catch {
    writeLocalValue(USER_STORAGE_KEY, null);

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

      const user = readUserFromStorage();
      const token = user ? readLocalValue(TOKEN_STORAGE_KEY) : null;
      if (!token || !user) {
        writeLocalValue(TOKEN_STORAGE_KEY, null);
        writeLocalValue(USER_STORAGE_KEY, null);
      }
      patchState(store, { hydrated: true, token, user: token ? user : null });
    },
    setSession(session: AuthSession): void {
      writeLocalValue(TOKEN_STORAGE_KEY, session.token);
      writeLocalValue(USER_STORAGE_KEY, JSON.stringify(session.user));

      patchState(store, {
        hydrated: true,
        token: session.token,
        user: session.user,
      });
    },
    updateUser(user: UserIdentity): void {
      writeLocalValue(USER_STORAGE_KEY, JSON.stringify(user));

      patchState(store, {
        user,
      });
    },
    clear(): void {
      writeLocalValue(TOKEN_STORAGE_KEY, null);
      writeLocalValue(USER_STORAGE_KEY, null);

      patchState(store, {
        hydrated: true,
        token: null,
        user: null,
      });
    },
  })),
);
