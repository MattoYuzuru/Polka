import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, finalize, map, switchMap, tap } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { BookApiService } from '../../../../core/services/book-api.service';
import { ProfileApiService } from '../../../../core/services/profile-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { UiPreferencesStore } from '../../../../core/stores/ui-preferences.store';
import { PublicProfile } from '../../../../shared/models/profile.model';

@Component({
  selector: 'app-profile-page',
  imports: [
    RouterLink,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiCardLarge,
    TuiChip,
    TuiHeader,
    TuiSurface,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookApiService = inject(BookApiService);
  private readonly profileApiService = inject(ProfileApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);
  protected readonly uiPreferencesStore = inject(UiPreferencesStore);

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly processingBookId = signal<string | null>(null);

  private readonly currentNickname = signal('');

  protected readonly isOwner = computed(() => {
    const profile = this.profile();
    const user = this.authSessionStore.user();

    return Boolean(profile && user && profile.user.nickname === user.nickname);
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('nickname') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.profile.set(null);
        }),
        switchMap((nickname) => {
          this.currentNickname.set(nickname);

          if (!nickname) {
            this.errorMessage.set('Профиль не найден.');
            this.isLoading.set(false);

            return EMPTY;
          }

          return this.profileApiService.getPublicProfile(nickname).pipe(
            tap((profile) => {
              this.profile.set(profile);
              this.uiPreferencesStore.syncProfileGradient(profile.gradientStops);
              this.isLoading.set(false);
            }),
            catchError(() => {
              this.errorMessage.set('Не удалось загрузить профиль. Попробуйте позже.');
              this.isLoading.set(false);

              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected copyLink(): void {
    const clipboard = globalThis.navigator?.clipboard;

    if (!clipboard) {
      return;
    }

    void clipboard.writeText(globalThis.location?.href ?? '').then(() => {
      this.copied.set(true);

      globalThis.setTimeout(() => this.copied.set(false), 1800);
    });
  }

  protected toggleBookVisibility(bookId: string, isPublic: boolean): void {
    this.processingBookId.set(bookId);

    this.bookApiService
      .setBookVisibility(bookId, !isPublic)
      .pipe(
        finalize(() => this.processingBookId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadProfile(),
        error: () => this.errorMessage.set('Не удалось изменить публичность книги.'),
      });
  }

  protected deleteBook(bookId: string): void {
    if (!globalThis.confirm('Удалить книгу из библиотеки?')) {
      return;
    }

    this.processingBookId.set(bookId);

    this.bookApiService
      .deleteBook(bookId)
      .pipe(
        finalize(() => this.processingBookId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadProfile(),
        error: () => this.errorMessage.set('Не удалось удалить книгу.'),
      });
  }

  protected logout(): void {
    this.authSessionStore.clear();
    void this.router.navigateByUrl('/login');
  }

  private reloadProfile(): void {
    const nickname = this.currentNickname();
    if (!nickname) {
      return;
    }

    this.profileApiService
      .getPublicProfile(nickname)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.uiPreferencesStore.syncProfileGradient(profile.gradientStops);
        },
        error: () => this.errorMessage.set('Не удалось обновить профиль после изменения книги.'),
      });
  }
}
