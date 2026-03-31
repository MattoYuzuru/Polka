import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, finalize, map, switchMap, tap } from 'rxjs';

import { BookApiService } from '../../../../core/services/book-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { BOOK_STATUS_OPTIONS } from '../../../../shared/data/book-form.constants';
import {
  type BookDetails,
  type BookFormValue,
  type BookOpinion,
  type BookQuote,
  type CreateBookPayload,
} from '../../../../shared/models/book.model';

type BookContentTab = 'quotes' | 'opinions';
type BookEntry = BookQuote | BookOpinion;

const NAVIGATION_THRESHOLD = 280;
const TYPEWRITER_INTERVAL_MS = 14;

@Component({
  selector: 'app-book-details-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './book-details-page.component.html',
  styleUrl: './book-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailsPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookApiService = inject(BookApiService);
  private readonly authSessionStore = inject(AuthSessionStore);

  private activeCoverObjectUrl: string | null = null;
  private typewriterTimer: number | null = null;
  private wheelResetTimer: number | null = null;

  protected readonly book = signal<BookDetails | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isProcessing = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isUploadingCover = signal(false);
  protected readonly isCoverModalOpen = signal(false);
  protected readonly activeTab = signal<BookContentTab>('quotes');
  protected readonly activeEntryIndex = signal(0);
  protected readonly isImmersed = signal(false);
  protected readonly navigationProgress = signal(0);
  protected readonly renderedEntryText = signal('');
  protected readonly coverPreviewUrl = signal<string | null>(null);
  protected readonly coverPreviewPalette = signal<string[]>([]);
  protected readonly hasCover = signal(false);
  protected readonly uploadedCoverKey = signal<string | null>(null);
  protected readonly removeCoverOnSubmit = signal(false);
  protected readonly statusOptions = BOOK_STATUS_OPTIONS;

  protected readonly bookForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    author: ['', [Validators.required, Validators.minLength(2)]],
    genre: ['', [Validators.required]],
    publisher: ['', [Validators.required, Validators.minLength(2)]],
    ageRating: ['16+', [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(0)]],
    status: [BOOK_STATUS_OPTIONS[6], [Validators.required]],
    isPublic: [true],
    rating: [null as number | null],
    description: [''],
    opinion: [''],
    quote: [''],
  });

  protected readonly backLink = computed(() => `/${this.book()?.ownerNickname ?? 'login'}`);
  protected readonly canEdit = computed(() => {
    const book = this.book();
    const currentUser = this.authSessionStore.user();

    return Boolean(book && (book.viewerCanEdit || currentUser?.nickname === book.ownerNickname));
  });
  protected readonly accentGradientCss = computed(() =>
    buildAccentGradient(this.coverPreviewPalette().length ? this.coverPreviewPalette() : null),
  );
  protected readonly displayedCoverUrl = computed(() =>
    this.hasCover() ? this.coverPreviewUrl() : null,
  );
  protected readonly displayedCoverPalette = computed(() =>
    this.coverPreviewPalette().length
      ? this.coverPreviewPalette()
      : ['#101010', '#8f5aff', '#ff7a51'],
  );
  protected readonly currentEntries = computed<BookEntry[]>(() => {
    const book = this.book();
    if (!book) {
      return [];
    }

    return this.activeTab() === 'quotes' ? book.quotes : book.opinions;
  });
  protected readonly currentEntry = computed(
    () => this.currentEntries()[this.activeEntryIndex()] ?? null,
  );
  protected readonly currentIndexLabel = computed(() =>
    this.currentEntries().length ? this.activeEntryIndex() + 1 : 0,
  );
  protected readonly nextIndexLabel = computed(() => {
    const entries = this.currentEntries();
    if (!entries.length) {
      return 0;
    }

    return Math.min(entries.length, this.activeEntryIndex() + 2);
  });
  protected readonly previousIndexLabel = computed(() =>
    this.currentEntries().length ? Math.max(1, this.activeEntryIndex()) : 0,
  );
  protected readonly hasNextEntry = computed(
    () => this.activeEntryIndex() < this.currentEntries().length - 1,
  );
  protected readonly hasPreviousEntry = computed(() => this.activeEntryIndex() > 0);
  protected readonly isCurrentEntryQuote = computed(() => this.activeTab() === 'quotes');
  protected readonly currentEntryContentClass = computed(() =>
    this.activeTab() === 'quotes'
      ? 'details-stream__content details-stream__content--quote'
      : 'details-stream__content',
  );
  protected readonly visibleArrowDirection = computed(() => {
    if (this.navigationProgress() < 0) {
      return 'up';
    }

    if (this.navigationProgress() > 0) {
      return 'down';
    }

    return this.hasNextEntry() ? 'down' : 'up';
  });
  protected readonly arrowTransform = computed(() => {
    const rotation = this.visibleArrowDirection() === 'up' ? 'rotate(180deg)' : 'rotate(0deg)';

    return `${rotation} scaleY(${this.navigationStretch()})`;
  });
  protected readonly navigationStretch = computed(
    () => 1 + Math.min(Math.abs(this.navigationProgress()) / NAVIGATION_THRESHOLD, 1) * 1.55,
  );
  protected readonly upcomingNumberScale = computed(
    () => 1 + Math.min(Math.abs(this.navigationProgress()) / NAVIGATION_THRESHOLD, 1) * 0.32,
  );
  protected readonly navigationAccent = computed(() => {
    if (!this.currentEntries().length) {
      return false;
    }

    return !this.hasNextEntry() && this.visibleArrowDirection() === 'down';
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('bookId') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.book.set(null);
          this.resetInteractiveState();
        }),
        switchMap((bookId) => {
          if (!bookId) {
            this.errorMessage.set('Книга не найдена.');
            this.isLoading.set(false);

            return EMPTY;
          }

          return this.bookApiService.getBook(bookId).pipe(
            tap((book) => {
              this.applyLoadedBook(book);
              this.isLoading.set(false);
            }),
            catchError(() => {
              this.errorMessage.set('Не удалось загрузить книгу.');
              this.isLoading.set(false);

              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.revokeLocalCoverPreview();
    });
  }

  protected openCoverModal(): void {
    if (!this.displayedCoverUrl()) {
      return;
    }

    this.isCoverModalOpen.set(true);
  }

  protected closeCoverModal(): void {
    this.isCoverModalOpen.set(false);
  }

  protected selectTab(tab: BookContentTab): void {
    if (this.activeTab() === tab) {
      return;
    }

    this.activeTab.set(tab);
    this.activeEntryIndex.set(0);
    this.isImmersed.set(false);
    this.navigationProgress.set(0);
    this.renderedEntryText.set('');
  }

  protected unlockEntry(viewport: HTMLElement): void {
    if (!this.currentEntries().length) {
      return;
    }

    viewport.scrollTo({ top: 0 });
    this.isImmersed.set(true);
    this.renderCurrentEntry(true);
  }

  protected onEntryWheel(event: WheelEvent, viewport: HTMLElement): void {
    if (!this.isImmersed() || this.isEditMode() || !this.currentEntries().length) {
      return;
    }

    const wantsNext = event.deltaY > 0;
    const atBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2;
    const atTop = viewport.scrollTop <= 1;

    if ((wantsNext && !atBottom) || (!wantsNext && !atTop)) {
      return;
    }

    event.preventDefault();

    const direction = wantsNext ? 1 : -1;
    const canMove = direction > 0 ? this.hasNextEntry() : this.hasPreviousEntry();
    const nextProgress = clamp(
      this.navigationProgress() + event.deltaY * 0.75,
      -NAVIGATION_THRESHOLD,
      NAVIGATION_THRESHOLD,
    );

    this.navigationProgress.set(nextProgress);
    this.queueNavigationProgressReset();

    if (!canMove) {
      return;
    }

    if (Math.abs(nextProgress) >= NAVIGATION_THRESHOLD) {
      this.changeEntry(direction, viewport);
    }
  }

  protected enterEditMode(): void {
    const book = this.book();
    if (!book) {
      return;
    }

    this.bookForm.reset(mapBookToFormValue(book));
    this.syncCoverStateFromBook(book);
    this.isEditMode.set(true);
    this.closeCoverModal();
  }

  protected cancelEdit(): void {
    const book = this.book();
    if (!book) {
      this.isEditMode.set(false);
      return;
    }

    this.bookForm.reset(mapBookToFormValue(book));
    this.syncCoverStateFromBook(book);
    this.isEditMode.set(false);
  }

  protected submitEdit(): void {
    const book = this.book();
    if (!book || this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();

      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    this.bookApiService
      .updateBook(book.id, this.buildPayload())
      .pipe(
        finalize(() => this.isProcessing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedBook) => {
          this.applyLoadedBook(updatedBook);
          this.isEditMode.set(false);
        },
        error: () => this.errorMessage.set('Не удалось сохранить изменения книги.'),
      });
  }

  protected uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);
    if (!file) {
      return;
    }

    this.isUploadingCover.set(true);
    this.setLocalCoverPreview(URL.createObjectURL(file));

    this.bookApiService
      .uploadCover(file)
      .pipe(
        finalize(() => {
          this.isUploadingCover.set(false);
          if (input) {
            input.value = '';
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (uploadedCover) => {
          this.uploadedCoverKey.set(uploadedCover.coverObjectKey);
          this.coverPreviewPalette.set(uploadedCover.coverPalette);
          this.hasCover.set(true);
          this.removeCoverOnSubmit.set(false);
        },
        error: () => {
          this.errorMessage.set('Не удалось загрузить новую обложку.');
          const book = this.book();
          if (book) {
            this.syncCoverStateFromBook(book);
          }
        },
      });
  }

  protected removeCover(): void {
    const book = this.book();
    this.revokeLocalCoverPreview();
    this.uploadedCoverKey.set(null);
    this.coverPreviewUrl.set(null);
    this.coverPreviewPalette.set([]);
    this.hasCover.set(false);
    this.removeCoverOnSubmit.set(Boolean(book?.coverUrl));
  }

  protected toggleDraftVisibility(): void {
    const currentValue = this.bookForm.controls.isPublic.value;
    this.bookForm.controls.isPublic.setValue(!currentValue);
  }

  protected deleteBook(): void {
    const book = this.book();
    if (!book || !globalThis.confirm('Удалить книгу?')) {
      return;
    }

    this.isProcessing.set(true);

    this.bookApiService
      .deleteBook(book.id)
      .pipe(
        finalize(() => this.isProcessing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(`/${book.ownerNickname}`),
        error: () => this.errorMessage.set('Не удалось удалить книгу.'),
      });
  }

  private applyLoadedBook(book: BookDetails): void {
    this.book.set(book);
    this.bookForm.reset(mapBookToFormValue(book));
    this.syncCoverStateFromBook(book);
    this.activeEntryIndex.set(0);
    this.navigationProgress.set(0);
    this.isImmersed.set(false);
    this.renderedEntryText.set('');
  }

  private changeEntry(direction: 1 | -1, viewport: HTMLElement): void {
    const nextIndex = this.activeEntryIndex() + direction;
    if (nextIndex < 0 || nextIndex >= this.currentEntries().length) {
      return;
    }

    viewport.scrollTo({ top: 0, behavior: 'smooth' });
    this.activeEntryIndex.set(nextIndex);
    this.navigationProgress.set(0);
    this.renderCurrentEntry(true);
  }

  private renderCurrentEntry(animate: boolean): void {
    const entry = this.currentEntry();
    if (!entry) {
      this.renderedEntryText.set('');
      return;
    }

    const targetText = formatEntryContent(entry.content, this.activeTab());
    this.clearTypewriterTimer();

    if (!animate) {
      this.renderedEntryText.set(targetText);
      return;
    }

    let cursor = 0;
    this.renderedEntryText.set('');
    this.typewriterTimer = window.setInterval(() => {
      cursor += 1;
      this.renderedEntryText.set(targetText.slice(0, cursor));

      if (cursor >= targetText.length) {
        this.clearTypewriterTimer();
      }
    }, TYPEWRITER_INTERVAL_MS);
  }

  private buildPayload(): CreateBookPayload {
    return {
      ...this.bookForm.getRawValue(),
      coverObjectKey: this.uploadedCoverKey(),
      coverPalette: this.hasCover() ? this.coverPreviewPalette() : [],
      removeCover: this.removeCoverOnSubmit(),
    };
  }

  private syncCoverStateFromBook(book: BookDetails): void {
    this.revokeLocalCoverPreview();
    this.uploadedCoverKey.set(null);
    this.removeCoverOnSubmit.set(false);
    this.coverPreviewUrl.set(book.coverUrl);
    this.coverPreviewPalette.set(book.coverPalette);
    this.hasCover.set(Boolean(book.coverUrl));
  }

  private setLocalCoverPreview(url: string): void {
    this.revokeLocalCoverPreview();
    this.activeCoverObjectUrl = url;
    this.coverPreviewUrl.set(url);
    this.hasCover.set(true);
  }

  private revokeLocalCoverPreview(): void {
    if (this.activeCoverObjectUrl) {
      URL.revokeObjectURL(this.activeCoverObjectUrl);
      this.activeCoverObjectUrl = null;
    }
  }

  private queueNavigationProgressReset(): void {
    if (this.wheelResetTimer) {
      window.clearTimeout(this.wheelResetTimer);
    }

    this.wheelResetTimer = window.setTimeout(() => {
      this.navigationProgress.set(0);
      this.wheelResetTimer = null;
    }, 180);
  }

  private clearTypewriterTimer(): void {
    if (this.typewriterTimer) {
      window.clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearTypewriterTimer();

    if (this.wheelResetTimer) {
      window.clearTimeout(this.wheelResetTimer);
      this.wheelResetTimer = null;
    }
  }

  private resetInteractiveState(): void {
    this.clearTimers();
    this.activeTab.set('quotes');
    this.activeEntryIndex.set(0);
    this.isImmersed.set(false);
    this.navigationProgress.set(0);
    this.renderedEntryText.set('');
    this.isEditMode.set(false);
    this.isCoverModalOpen.set(false);
  }
}

function mapBookToFormValue(book: BookDetails): BookFormValue {
  return {
    title: book.title,
    author: book.author,
    description: book.description,
    year: book.year,
    publisher: book.publisher,
    ageRating: book.ageRating,
    genre: book.genre,
    isPublic: book.isPublic,
    status: book.status,
    rating: book.rating,
    opinion: book.opinions[0]?.content ?? '',
    quote: book.quotes[0]?.content ?? '',
  };
}

function buildAccentGradient(colors: string[] | null): string {
  const palette = colors?.length ? colors : ['#101010', '#8f5aff', '#ff7a51'];

  return `linear-gradient(135deg, ${palette.join(', ')})`;
}

function formatEntryContent(content: string, tab: BookContentTab): string {
  if (!content.trim()) {
    return '';
  }

  return tab === 'quotes' ? `«${content.trim()}»` : content.trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
