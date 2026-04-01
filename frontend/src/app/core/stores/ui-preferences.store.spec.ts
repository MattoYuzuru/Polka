import { TestBed } from '@angular/core/testing';

import { UiPreferencesStore } from './ui-preferences.store';

describe('UiPreferencesStore', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    globalThis.sessionStorage.clear();
  });

  it('uses the fallback gradient when session storage is empty', () => {
    const store = TestBed.inject(UiPreferencesStore);

    store.bootstrap();

    expect(store.gradientStops()).toEqual(['#101010', '#8f5aff', '#ff6b3d']);
  });

  it('hydrates gradient stops from session storage', () => {
    const gradientStops = ['#111111', '#222222', '#333333'];
    globalThis.sessionStorage.setItem(
      'polka.ui.profile-gradient',
      JSON.stringify({
        activeProfileKey: 'mattoy',
        gradientsByKey: {
          mattoy: gradientStops,
        },
      }),
    );
    const store = TestBed.inject(UiPreferencesStore);

    store.bootstrap();

    expect(store.gradientStops()).toEqual(gradientStops);
    expect(store.profileGradientCss()).toBe('linear-gradient(135deg, #111111, #222222, #333333)');
  });

  it('drops a broken session gradient payload', () => {
    globalThis.sessionStorage.setItem('polka.ui.profile-gradient', '{broken-json');
    const store = TestBed.inject(UiPreferencesStore);

    store.bootstrap();

    expect(store.gradientStops()).toEqual(['#101010', '#8f5aff', '#ff6b3d']);
    expect(globalThis.sessionStorage.getItem('polka.ui.profile-gradient')).toBeNull();
  });

  it('stores a new profile gradient', () => {
    const store = TestBed.inject(UiPreferencesStore);
    const gradientStops = ['#444444', '#bbbbbb'];

    store.syncProfileGradient('mattoy', gradientStops);

    expect(store.gradientStops()).toEqual(gradientStops);
    expect(globalThis.sessionStorage.getItem('polka.ui.profile-gradient')).toBe(
      JSON.stringify({
        activeProfileKey: 'mattoy',
        gradientsByKey: {
          mattoy: gradientStops,
        },
      }),
    );
  });

  it('falls back when an empty gradient list is passed', () => {
    const store = TestBed.inject(UiPreferencesStore);

    store.syncProfileGradient('mattoy', []);

    expect(store.gradientStops()).toEqual(['#101010', '#8f5aff', '#ff6b3d']);
  });

  it('keeps the first gradient for the same profile within a session', () => {
    const store = TestBed.inject(UiPreferencesStore);

    store.syncProfileGradient('mattoy', ['#111111', '#222222']);
    store.syncProfileGradient('mattoy', ['#333333', '#444444']);

    expect(store.gradientStops()).toEqual(['#111111', '#222222']);
  });

  it('clears the stored profile gradients explicitly', () => {
    const store = TestBed.inject(UiPreferencesStore);

    store.syncProfileGradient('mattoy', ['#111111', '#222222']);
    store.clearProfileGradientSession();

    expect(store.gradientStops()).toEqual(['#101010', '#8f5aff', '#ff6b3d']);
    expect(globalThis.sessionStorage.getItem('polka.ui.profile-gradient')).toBeNull();
  });
});
