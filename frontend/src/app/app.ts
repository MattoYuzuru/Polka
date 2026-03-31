import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';

import { AuthSessionStore } from './core/stores/auth-session.store';
import { UiPreferencesStore } from './core/stores/ui-preferences.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly uiPreferencesStore = inject(UiPreferencesStore);

  constructor() {
    this.authSessionStore.bootstrap();
    this.uiPreferencesStore.bootstrap();
  }
}
