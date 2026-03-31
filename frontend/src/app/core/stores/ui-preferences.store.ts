import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

const SESSION_GRADIENT_KEY = 'polka.ui.profile-gradient';
const FALLBACK_GRADIENT = ['#101010', '#8f5aff', '#ff6b3d'];

interface UiPreferencesState {
  gradientStops: string[];
}

function readGradientFromSession(): string[] {
  const rawValue = globalThis.sessionStorage?.getItem(SESSION_GRADIENT_KEY);

  if (!rawValue) {
    return FALLBACK_GRADIENT;
  }

  try {
    const parsed = JSON.parse(rawValue) as string[];

    return parsed.length ? parsed : FALLBACK_GRADIENT;
  } catch {
    globalThis.sessionStorage?.removeItem(SESSION_GRADIENT_KEY);

    return FALLBACK_GRADIENT;
  }
}

export const UiPreferencesStore = signalStore(
  { providedIn: 'root' },
  withState<UiPreferencesState>({
    gradientStops: FALLBACK_GRADIENT,
  }),
  withComputed(({ gradientStops }) => ({
    profileGradientCss: computed(
      () => `linear-gradient(135deg, ${gradientStops().join(', ')})`,
    ),
  })),
  withMethods((store) => ({
    bootstrap(): void {
      patchState(store, {
        gradientStops: readGradientFromSession(),
      });
    },
    syncProfileGradient(gradientStops: string[]): void {
      const normalizedStops = gradientStops.length ? gradientStops : FALLBACK_GRADIENT;

      globalThis.sessionStorage?.setItem(
        SESSION_GRADIENT_KEY,
        JSON.stringify(normalizedStops),
      );

      patchState(store, {
        gradientStops: normalizedStops,
      });
    },
  })),
);
