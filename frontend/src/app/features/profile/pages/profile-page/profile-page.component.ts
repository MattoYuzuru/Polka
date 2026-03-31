import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
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
import { RecommendationListApiService } from '../../../../core/services/recommendation-list-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { UiPreferencesStore } from '../../../../core/stores/ui-preferences.store';
import {
  BOOK_STATUSES,
  type BookCard,
  type BookStatus,
} from '../../../../shared/models/book.model';
import { type PublicProfile } from '../../../../shared/models/profile.model';

type BookSortOption = 'top' | 'rating' | 'year' | 'title';
type ReorderDirection = 'top' | 'up' | 'down';

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
  private readonly recommendationListApiService = inject(RecommendationListApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);
  protected readonly uiPreferencesStore = inject(UiPreferencesStore);

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly processingBookId = signal<string | null>(null);
  protected readonly processingListId = signal<string | null>(null);
  protected readonly bookSearch = signal('');
  protected readonly selectedStatus = signal<'all' | BookStatus>('all');
  protected readonly selectedSort = signal<BookSortOption>('top');
  protected readonly bookStatuses = BOOK_STATUSES;

  private readonly currentNickname = signal('');

  protected readonly isOwner = computed(() => {
    const profile = this.profile();
    const user = this.authSessionStore.user();

    return Boolean(profile && user && profile.user.nickname === user.nickname);
  });

  protected readonly hasActiveBookFilters = computed(
    () => this.bookSearch().trim() !== '' || this.selectedStatus() !== 'all',
  );

  protected readonly canReorderBooks = computed(
    () => this.isOwner() && !this.hasActiveBookFilters() && this.selectedSort() === 'top',
  );

  protected readonly visibleBooks = computed(() => {
    const books = this.profile()?.books ?? [];
    const normalizedQuery = this.bookSearch().trim().toLowerCase();
    const selectedStatus = this.selectedStatus();
    const sortedBooks = [...books].filter((book) => {
      const matchesQuery =
        normalizedQuery === '' ||
        [book.title, book.author, book.genre].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      const matchesStatus = selectedStatus === 'all' || book.status === selectedStatus;

      return matchesQuery && matchesStatus;
    });

    switch (this.selectedSort()) {
      case 'rating':
        return sortedBooks.sort(
          (left, right) =>
            (right.rating ?? -1) - (left.rating ?? -1) || left.rankPosition - right.rankPosition,
        );
      case 'year':
        return sortedBooks.sort(
          (left, right) => right.year - left.year || left.rankPosition - right.rankPosition,
        );
      case 'title':
        return sortedBooks.sort(
          (left, right) =>
            left.title.localeCompare(right.title, 'ru') || left.rankPosition - right.rankPosition,
        );
      default:
        return sortedBooks.sort((left, right) => left.rankPosition - right.rankPosition);
    }
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

  protected updateBookSearch(query: string): void {
    this.bookSearch.set(query);
  }

  protected updateStatusFilter(status: string): void {
    if (status === 'all') {
      this.selectedStatus.set('all');

      return;
    }

    if ((BOOK_STATUSES as readonly string[]).includes(status)) {
      this.selectedStatus.set(status as BookStatus);
    }
  }

  protected updateSortOption(option: string): void {
    if (option === 'top' || option === 'rating' || option === 'year' || option === 'title') {
      this.selectedSort.set(option);
    }
  }

  protected moveBook(bookId: string, direction: ReorderDirection): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    const reorderedBooks = reorderBooks(profile.books, bookId, direction);
    if (!reorderedBooks) {
      return;
    }

    this.processingBookId.set(bookId);

    this.bookApiService
      .reorderBooks({ bookIds: reorderedBooks.map((book) => book.id) })
      .pipe(
        finalize(() => this.processingBookId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadProfile(),
        error: () => this.errorMessage.set('Не удалось обновить порядок книг.'),
      });
  }

  protected canMoveBook(bookId: string, direction: Exclude<ReorderDirection, 'top'>): boolean {
    const books = this.profile()?.books ?? [];
    const bookIndex = books.findIndex((book) => book.id === bookId);

    if (bookIndex === -1) {
      return false;
    }

    if (direction === 'up') {
      return bookIndex > 0;
    }

    return bookIndex < books.length - 1;
  }

  protected canMoveBookToTop(bookId: string): boolean {
    const books = this.profile()?.books ?? [];

    return books.findIndex((book) => book.id === bookId) > 0;
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

  protected toggleRecommendationListVisibility(listId: string, isPublic: boolean): void {
    this.processingListId.set(listId);

    this.recommendationListApiService
      .setListVisibility(listId, !isPublic)
      .pipe(
        finalize(() => this.processingListId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadProfile(),
        error: () => this.errorMessage.set('Не удалось изменить публичность списка рекомендаций.'),
      });
  }

  protected deleteRecommendationList(listId: string): void {
    if (!globalThis.confirm('Удалить список рекомендаций?')) {
      return;
    }

    this.processingListId.set(listId);

    this.recommendationListApiService
      .deleteList(listId)
      .pipe(
        finalize(() => this.processingListId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadProfile(),
        error: () => this.errorMessage.set('Не удалось удалить список рекомендаций.'),
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

function reorderBooks(
  books: BookCard[],
  bookId: string,
  direction: ReorderDirection,
): BookCard[] | null {
  const reorderedBooks = [...books];
  const currentIndex = reorderedBooks.findIndex((book) => book.id === bookId);

  if (currentIndex === -1) {
    return null;
  }

  if (direction === 'top') {
    if (currentIndex === 0) {
      return null;
    }

    const [book] = reorderedBooks.splice(currentIndex, 1);
    reorderedBooks.unshift(book);

    return reorderedBooks;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= reorderedBooks.length) {
    return null;
  }

  [reorderedBooks[currentIndex], reorderedBooks[targetIndex]] = [
    reorderedBooks[targetIndex],
    reorderedBooks[currentIndex],
  ];

  return reorderedBooks;
}
