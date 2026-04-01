import { DestroyRef, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { filter } from 'rxjs';

import { AuthSessionStore } from './core/stores/auth-session.store';
import { UiPreferencesStore } from './core/stores/ui-preferences.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly uiPreferencesStore = inject(UiPreferencesStore);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly showFooter = computed(
    () => !/^\/books\/(?!new$)(?!import$)[^/]+$/.test(this.currentUrl()),
  );

  constructor() {
    this.authSessionStore.bootstrap();
    this.uiPreferencesStore.bootstrap();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects.split('?')[0] ?? event.urlAfterRedirects);
      });
  }
}
