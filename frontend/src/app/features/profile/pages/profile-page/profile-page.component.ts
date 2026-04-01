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
import {
  EMPTY,
  auditTime,
  catchError,
  distinctUntilChanged,
  finalize,
  fromEvent,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';
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
  type ReorderBooksPayload,
} from '../../../../shared/models/book.model';
import { type PublicProfile } from '../../../../shared/models/profile.model';
import { type RecommendationListDetails } from '../../../../shared/models/recommendation-list.model';

type ActiveShelfKey = 'library' | `list:${string}`;
type ShelfKind = 'library' | 'list';
type BookSortOption = 'top' | 'rating' | 'year' | 'title';

interface ShelfTab {
  key: ActiveShelfKey;
  kind: ShelfKind;
  title: string;
  description: string;
  booksCount: number;
  isPublic: boolean;
  listId?: string;
}

interface ShelfBook {
  id: string;
  rankPosition: number;
  displayRankPosition: number;
  title: string;
  author: string;
  genre: string;
  year: number | null;
  isPublic: boolean;
  status: string;
  rating: number | null;
  opinionPreview: string;
  coverPalette: string[];
  coverUrl: string | null;
  source: ShelfKind;
}

const INITIAL_BOOKS_BATCH = 6;

@Component({
  selector: 'app-profile-page',
  imports: [RouterLink, TuiButton, TuiCardLarge, TuiChip, TuiHeader, TuiSurface],
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

  private readonly currentNickname = signal('');
  private readonly listCache = new Map<string, RecommendationListDetails>();

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly activeList = signal<RecommendationListDetails | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingShelf = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly processingBookId = signal<string | null>(null);
  protected readonly processingListId = signal<string | null>(null);
  protected readonly isExportingShelf = signal(false);
  protected readonly bookSearch = signal('');
  protected readonly selectedStatus = signal<'all' | BookStatus>('all');
  protected readonly selectedSort = signal<BookSortOption>('top');
  protected readonly selectedShelfKey = signal<ActiveShelfKey>('library');
  protected readonly visibleBooksLimit = signal(INITIAL_BOOKS_BATCH);
  protected readonly isPreviewingAsGuest = signal(false);
  protected readonly isCreateMenuOpen = signal(false);
  protected readonly activeBookMenuId = signal<string | null>(null);
  protected readonly draggedBookId = signal<string | null>(null);
  protected readonly bookStatuses = BOOK_STATUSES;

  protected readonly isOwner = computed(() => {
    const profile = this.profile();
    const user = this.authSessionStore.user();

    return Boolean(profile && user && profile.user.nickname === user.nickname);
  });

  protected readonly ownerMode = computed(() => this.isOwner() && !this.isPreviewingAsGuest());

  protected readonly visibleRecommendationLists = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    return this.ownerMode()
      ? profile.recommendationLists
      : profile.recommendationLists.filter((item) => item.isPublic);
  });

  protected readonly shelfTabs = computed<ShelfTab[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    return [
      {
        key: 'library',
        kind: 'library',
        title: 'Библиотека',
        description:
          profile.user.tagline ||
          'Главная полка владельца. Здесь видно порядок книг, статус чтения и личные заметки.',
        booksCount: this.ownerMode()
          ? profile.books.length
          : profile.books.filter((book) => book.isPublic).length,
        isPublic: true,
      },
      ...this.visibleRecommendationLists().map((item) => ({
        key: `list:${item.id}` as const,
        kind: 'list' as const,
        title: item.title,
        description: item.description,
        booksCount: item.booksCount,
        isPublic: item.isPublic,
        listId: item.id,
      })),
    ];
  });

  protected readonly activeShelf = computed(() => {
    const tabs = this.shelfTabs();
    return tabs.find((tab) => tab.key === this.selectedShelfKey()) ?? tabs[0] ?? null;
  });

  protected readonly activeShelfDescription = computed(() => {
    const activeShelf = this.activeShelf();
    const activeList = this.activeList();

    if (!activeShelf) {
      return '';
    }

    if (activeShelf.kind === 'list') {
      return (
        activeList?.description || activeShelf.description || 'Описание подборки ещё не добавлено.'
      );
    }

    return activeShelf.description;
  });

  protected readonly canCopyActiveShelf = computed(() => {
    const activeShelf = this.activeShelf();
    if (!activeShelf) {
      return false;
    }

    return activeShelf.kind === 'library' || activeShelf.isPublic;
  });

  protected readonly profileMemberSinceLabel = computed(() => {
    const rawLabel = this.profile()?.stats.memberSinceLabel ?? '';

    return rawLabel.replace(/^с\s+/i, '');
  });

  protected readonly normalizedBooks = computed<ShelfBook[]>(() => {
    const profile = this.profile();
    const activeShelf = this.activeShelf();
    if (!profile || !activeShelf) {
      return [];
    }

    if (activeShelf.kind === 'library') {
      return profile.books
        .filter((book) => this.ownerMode() || book.isPublic)
        .map((book, index) => ({
          id: book.id,
          rankPosition: book.rankPosition,
          displayRankPosition: this.ownerMode() ? book.rankPosition : index + 1,
          title: book.title,
          author: book.author,
          genre: book.genre,
          year: book.year,
          isPublic: book.isPublic,
          status: book.status,
          rating: book.rating,
          opinionPreview: book.opinionPreview,
          coverPalette: book.coverPalette,
          coverUrl: book.coverUrl,
          source: 'library',
        }));
    }

    const activeList = this.activeList();
    if (!activeList) {
      return [];
    }

    return activeList.books
      .filter((book) => this.ownerMode() || book.isPublic)
      .map((book, index) => ({
        id: book.id,
        rankPosition: index + 1,
        displayRankPosition: index + 1,
        title: book.title,
        author: book.author,
        genre: book.genre,
        year: null,
        isPublic: book.isPublic,
        status: book.status,
        rating: book.rating,
        opinionPreview: '',
        coverPalette: book.coverPalette,
        coverUrl: book.coverUrl,
        source: 'list',
      }));
  });

  protected readonly filteredBooks = computed(() => {
    const searchQuery = this.bookSearch().trim().toLowerCase();

    const matchingBooks = this.normalizedBooks().filter((book) => {
      const matchesSearch =
        searchQuery === '' ||
        [book.title, book.author, book.genre].some((value) =>
          value.toLowerCase().includes(searchQuery),
        );
      const matchesStatus =
        this.selectedStatus() === 'all' || book.status === this.selectedStatus();

      return matchesSearch && matchesStatus;
    });

    switch (this.selectedSort()) {
      case 'rating':
        return matchingBooks.sort(
          (left, right) =>
            (right.rating ?? -1) - (left.rating ?? -1) || left.rankPosition - right.rankPosition,
        );
      case 'year':
        return matchingBooks.sort(
          (left, right) =>
            (right.year ?? -1) - (left.year ?? -1) || left.rankPosition - right.rankPosition,
        );
      case 'title':
        return matchingBooks.sort(
          (left, right) =>
            left.title.localeCompare(right.title, 'ru') || left.rankPosition - right.rankPosition,
        );
      default:
        return matchingBooks.sort((left, right) => left.rankPosition - right.rankPosition);
    }
  });

  protected readonly visibleBooks = computed(() =>
    this.filteredBooks().slice(0, this.visibleBooksLimit()),
  );

  protected readonly hasMoreBooks = computed(
    () => this.visibleBooks().length < this.filteredBooks().length,
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('nickname') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.profile.set(null);
          this.activeList.set(null);
          this.isPreviewingAsGuest.set(false);
          this.isCreateMenuOpen.set(false);
          this.activeBookMenuId.set(null);
          this.visibleBooksLimit.set(INITIAL_BOOKS_BATCH);
          this.selectedShelfKey.set('library');
          this.listCache.clear();
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
              this.uiPreferencesStore.syncProfileGradient(
                profile.user.nickname,
                profile.gradientStops,
              );
              this.normalizeActiveShelfSelection();
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

    if (typeof window !== 'undefined') {
      fromEvent(window, 'scroll')
        .pipe(auditTime(120), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.tryLoadMoreBooks());
    }
  }

  protected copyActiveShelfLink(): void {
    if (!this.canCopyActiveShelf()) {
      return;
    }

    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) {
      return;
    }

    const activeShelf = this.activeShelf();
    const origin = globalThis.location?.origin ?? '';
    const link =
      activeShelf?.kind === 'list' && activeShelf.listId
        ? `${origin}/lists/${activeShelf.listId}`
        : `${origin}/${this.currentNickname()}`;

    void clipboard.writeText(link).then(() => {
      this.copied.set(true);
      globalThis.setTimeout(() => this.copied.set(false), 1800);
    });
  }

  protected downloadShelfArchive(): void {
    const profile = this.profile();
    if (!profile || this.activeShelf()?.kind !== 'library' || this.isExportingShelf()) {
      return;
    }

    this.isExportingShelf.set(true);
    this.errorMessage.set(null);

    this.profileApiService
      .downloadShelfArchive(profile.user.nickname)
      .pipe(
        finalize(() => this.isExportingShelf.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (archive) => {
          const objectUrl = URL.createObjectURL(archive);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = `${profile.user.nickname}-shelf.zip`;
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(objectUrl);
        },
        error: () => this.errorMessage.set('Не удалось сохранить архив полки.'),
      });
  }

  protected updateBookSearch(query: string): void {
    this.bookSearch.set(query);
    this.resetVisibleBooks();
  }

  protected updateStatusFilter(status: string): void {
    if (status === 'all' || (BOOK_STATUSES as readonly string[]).includes(status)) {
      this.selectedStatus.set(status as 'all' | BookStatus);
      this.resetVisibleBooks();
    }
  }

  protected updateSortOption(option: string): void {
    if (option === 'top' || option === 'rating' || option === 'year' || option === 'title') {
      this.selectedSort.set(option);
      this.resetVisibleBooks();
    }
  }

  protected toggleCreateMenu(event?: Event): void {
    event?.stopPropagation();
    this.isCreateMenuOpen.update((current) => !current);
  }

  protected closeCreateMenu(): void {
    this.isCreateMenuOpen.set(false);
  }

  protected toggleGuestPreview(): void {
    this.isPreviewingAsGuest.update((current) => !current);
    this.normalizeActiveShelfSelection();
    this.closeAllFloatingUi();
    this.resetVisibleBooks();
  }

  protected selectShelf(key: ActiveShelfKey): void {
    if (this.selectedShelfKey() === key) {
      return;
    }

    this.selectedShelfKey.set(key);
    this.bookSearch.set('');
    this.selectedStatus.set('all');
    this.selectedSort.set('top');
    this.closeAllFloatingUi();
    this.resetVisibleBooks();

    if (key !== 'library') {
      void this.loadListIfNeeded(key.replace('list:', ''));
    } else {
      this.activeList.set(null);
    }
  }

  protected toggleBookMenu(event: Event, bookId: string): void {
    event.stopPropagation();
    this.activeBookMenuId.update((current) => (current === bookId ? null : bookId));
  }

  protected closeBookMenu(): void {
    this.activeBookMenuId.set(null);
  }

  protected onBookHandleDragStart(event: DragEvent, bookId: string): void {
    if (!this.canReorderBooks()) {
      event.preventDefault();

      return;
    }

    this.draggedBookId.set(bookId);
    this.activeBookMenuId.set(null);
    event.dataTransfer?.setData('text/plain', bookId);
    event.dataTransfer?.setDragImage(new Image(), 0, 0);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onBookHandleDragEnd(): void {
    this.draggedBookId.set(null);
  }

  protected onBookDragOver(event: DragEvent): void {
    if (!this.draggedBookId()) {
      return;
    }

    event.preventDefault();
  }

  protected onBookDrop(event: DragEvent, targetBookId: string): void {
    event.preventDefault();

    const sourceBookId = this.draggedBookId();
    this.draggedBookId.set(null);
    if (!sourceBookId || sourceBookId === targetBookId || !this.canReorderBooks()) {
      return;
    }

    const profile = this.profile();
    if (!profile) {
      return;
    }

    const reorderedBooks = moveBookToTarget(profile.books, sourceBookId, targetBookId);
    if (!reorderedBooks) {
      return;
    }

    this.processingBookId.set(sourceBookId);
    this.bookApiService
      .reorderBooks({
        bookIds: reorderedBooks.map((book) => book.id),
      } satisfies ReorderBooksPayload)
      .pipe(
        finalize(() => this.processingBookId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.profile.update((currentProfile) =>
            currentProfile
              ? {
                  ...currentProfile,
                  books: reorderedBooks,
                }
              : currentProfile,
          );
        },
        error: () => this.errorMessage.set('Не удалось обновить порядок книг.'),
      });
  }

  protected canReorderBooks(): boolean {
    return (
      this.ownerMode() && this.activeShelf()?.kind === 'library' && this.selectedSort() === 'top'
    );
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
        next: () => {
          this.closeBookMenu();
          this.reloadProfile();
        },
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
        next: () => {
          this.closeBookMenu();
          this.reloadProfile();
        },
        error: () => this.errorMessage.set('Не удалось удалить книгу.'),
      });
  }

  protected removeBookFromActiveList(bookId: string): void {
    const activeList = this.activeList();
    if (!activeList || !globalThis.confirm('Убрать книгу из текущей подборки?')) {
      return;
    }

    this.processingListId.set(activeList.id);

    this.recommendationListApiService
      .updateList(activeList.id, {
        title: activeList.title,
        description: activeList.description,
        isPublic: activeList.isPublic,
        bookIds: activeList.books.filter((book) => book.id !== bookId).map((book) => book.id),
      })
      .pipe(
        finalize(() => this.processingListId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedList) => {
          this.closeBookMenu();
          this.activeList.set(updatedList);
          this.listCache.set(updatedList.id, updatedList);
          this.reloadProfile();
        },
        error: () => this.errorMessage.set('Не удалось обновить подборку.'),
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
        next: (updatedList) => {
          this.activeList.set(updatedList);
          this.listCache.set(updatedList.id, updatedList);
          this.reloadProfile();
        },
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
        next: () => {
          this.activeList.set(null);
          this.listCache.delete(listId);
          this.selectedShelfKey.set('library');
          this.reloadProfile();
        },
        error: () => this.errorMessage.set('Не удалось удалить список рекомендаций.'),
      });
  }

  protected logout(): void {
    this.authSessionStore.clear();
    this.uiPreferencesStore.clearProfileGradientSession();
    void this.router.navigateByUrl('/login');
  }

  private tryLoadMoreBooks(): void {
    if (!this.hasMoreBooks()) {
      return;
    }

    const documentElement = globalThis.document?.documentElement;
    if (!documentElement) {
      return;
    }

    const remainingDistance = documentElement.scrollHeight - window.innerHeight - window.scrollY;
    if (remainingDistance < 420) {
      this.visibleBooksLimit.update((current) => current + INITIAL_BOOKS_BATCH);
    }
  }

  private resetVisibleBooks(): void {
    this.visibleBooksLimit.set(INITIAL_BOOKS_BATCH);
  }

  private closeAllFloatingUi(): void {
    this.isCreateMenuOpen.set(false);
    this.activeBookMenuId.set(null);
  }

  private normalizeActiveShelfSelection(): void {
    const availableKeys = new Set(this.shelfTabs().map((tab) => tab.key));

    if (!availableKeys.has(this.selectedShelfKey())) {
      this.selectedShelfKey.set('library');
      this.activeList.set(null);
      return;
    }

    const activeShelf = this.activeShelf();
    if (activeShelf?.kind === 'list' && activeShelf.listId) {
      void this.loadListIfNeeded(activeShelf.listId);
    }
  }

  private async loadListIfNeeded(listId: string): Promise<void> {
    const cachedList = this.listCache.get(listId);
    if (cachedList) {
      this.activeList.set(cachedList);
      return;
    }

    this.isLoadingShelf.set(true);
    this.recommendationListApiService
      .getList(listId)
      .pipe(
        finalize(() => this.isLoadingShelf.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (recommendationList) => {
          this.listCache.set(listId, recommendationList);
          this.activeList.set(recommendationList);
        },
        error: () => this.errorMessage.set('Не удалось загрузить выбранную подборку.'),
      });
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
          this.uiPreferencesStore.syncProfileGradient(profile.user.nickname, profile.gradientStops);
          this.normalizeActiveShelfSelection();
        },
        error: () => this.errorMessage.set('Не удалось обновить профиль после изменения контента.'),
      });
  }
}

function moveBookToTarget(
  books: BookCard[],
  sourceBookId: string,
  targetBookId: string,
): BookCard[] | null {
  const reorderedBooks = [...books];
  const sourceIndex = reorderedBooks.findIndex((book) => book.id === sourceBookId);
  const targetIndex = reorderedBooks.findIndex((book) => book.id === targetBookId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return null;
  }

  const [movedBook] = reorderedBooks.splice(sourceIndex, 1);
  reorderedBooks.splice(targetIndex, 0, movedBook);

  return reorderedBooks.map((book, index) => ({
    ...book,
    rankPosition: index + 1,
  }));
}
