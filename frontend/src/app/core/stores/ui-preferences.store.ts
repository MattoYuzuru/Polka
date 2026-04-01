import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

const SESSION_GRADIENT_KEY = 'polka.ui.profile-gradient';
const FALLBACK_GRADIENT = ['#101010', '#8f5aff', '#ff6b3d'];
const LEGACY_PROFILE_KEY = '__legacy__';

interface UiPreferencesState {
  activeProfileKey: string | null;
  gradientStops: string[];
  gradientsByKey: Record<string, string[]>;
}

interface StoredGradientPayload {
  activeProfileKey: string | null;
  gradientsByKey: Record<string, string[]>;
}

function isGradientStops(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeGradientStops(gradientStops: string[]): string[] {
  return gradientStops.length ? gradientStops : FALLBACK_GRADIENT;
}

function readGradientFromSession(): StoredGradientPayload {
  const rawValue = globalThis.sessionStorage?.getItem(SESSION_GRADIENT_KEY);

  if (!rawValue) {
    return {
      activeProfileKey: null,
      gradientsByKey: {},
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as
      | string[]
      | {
          activeProfileKey?: string | null;
          gradientsByKey?: Record<string, string[]>;
        };

    if (isGradientStops(parsed)) {
      return {
        activeProfileKey: LEGACY_PROFILE_KEY,
        gradientsByKey: {
          [LEGACY_PROFILE_KEY]: normalizeGradientStops(parsed),
        },
      };
    }

    const gradientsByKey = Object.fromEntries(
      Object.entries(parsed.gradientsByKey ?? {}).flatMap(([profileKey, gradientStops]) =>
        isGradientStops(gradientStops) ? [[profileKey, normalizeGradientStops(gradientStops)]] : [],
      ),
    );

    return {
      activeProfileKey:
        typeof parsed.activeProfileKey === 'string' && parsed.activeProfileKey.trim() !== ''
          ? parsed.activeProfileKey
          : null,
      gradientsByKey,
    };
  } catch {
    globalThis.sessionStorage?.removeItem(SESSION_GRADIENT_KEY);

    return {
      activeProfileKey: null,
      gradientsByKey: {},
    };
  }
}

function writeGradientToSession(payload: StoredGradientPayload): void {
  globalThis.sessionStorage?.setItem(SESSION_GRADIENT_KEY, JSON.stringify(payload));
}

export const UiPreferencesStore = signalStore(
  { providedIn: 'root' },
  withState<UiPreferencesState>({
    activeProfileKey: null,
    gradientStops: FALLBACK_GRADIENT,
    gradientsByKey: {},
  }),
  withComputed(({ gradientStops }) => ({
    profileGradientCss: computed(() => `linear-gradient(135deg, ${gradientStops().join(', ')})`),
  })),
  withMethods((store) => ({
    bootstrap(): void {
      const storedGradient = readGradientFromSession();
      const activeGradient =
        (storedGradient.activeProfileKey
          ? storedGradient.gradientsByKey[storedGradient.activeProfileKey]
          : null) ??
        Object.values(storedGradient.gradientsByKey)[0] ??
        FALLBACK_GRADIENT;

      patchState(store, {
        activeProfileKey: storedGradient.activeProfileKey,
        gradientStops: activeGradient,
        gradientsByKey: storedGradient.gradientsByKey,
      });
    },
    syncProfileGradient(profileKey: string, gradientStops: string[]): void {
      const normalizedProfileKey = profileKey.trim();
      const normalizedStops = normalizeGradientStops(gradientStops);
      const gradientsByKey = store.gradientsByKey();
      const storedGradient = gradientsByKey[normalizedProfileKey];
      const nextGradientStops = storedGradient ?? normalizedStops;
      const nextGradientsByKey = {
        ...gradientsByKey,
        [normalizedProfileKey]: nextGradientStops,
      };

      writeGradientToSession({
        activeProfileKey: normalizedProfileKey,
        gradientsByKey: nextGradientsByKey,
      });

      patchState(store, {
        activeProfileKey: normalizedProfileKey,
        gradientStops: nextGradientStops,
        gradientsByKey: nextGradientsByKey,
      });
    },
    clearProfileGradientSession(): void {
      globalThis.sessionStorage?.removeItem(SESSION_GRADIENT_KEY);

      patchState(store, {
        activeProfileKey: null,
        gradientStops: FALLBACK_GRADIENT,
        gradientsByKey: {},
      });
    },
  })),
);
