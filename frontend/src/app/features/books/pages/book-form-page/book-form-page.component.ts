import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { BookApiService } from '../../../../core/services/book-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { BOOK_STATUS_OPTIONS } from '../../../../shared/data/book-form.constants';
import {
  type BookDetails,
  type BookFormValue,
  type CreateBookPayload,
} from '../../../../shared/models/book.model';

const BOOK_DRAFT_KEY = 'polka.books.create-draft';

@Component({
  selector: 'app-book-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TuiBadge,
    TuiButton,
    TuiCardLarge,
    TuiChip,
    TuiHeader,
    TuiSurface,
  ],
  templateUrl: './book-form-page.component.html',
  styleUrl: './book-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bookApiService = inject(BookApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);

  private editingBookId: string | null = null;
  private activeCoverObjectUrl: string | null = null;
  private initialFormValue: BookFormValue | null = null;
  private initialCoverUrl: string | null = null;
  private initialCoverPalette: string[] = [];
  private hasInitialCover = false;
  private isDraftWatcherAttached = false;

  protected readonly statusOptions = BOOK_STATUS_OPTIONS;
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isUploadingCover = signal(false);
  protected readonly coverPreviewUrl = signal<string | null>(null);
  protected readonly coverPreviewPalette = signal<string[]>([]);
  protected readonly hasCover = signal(false);
  protected readonly uploadedCoverKey = signal<string | null>(null);
  protected readonly removeCoverOnSubmit = signal(false);

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

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('bookId')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((bookId) => {
        this.editingBookId = bookId;
        this.isEditMode.set(Boolean(bookId));

        if (bookId) {
          this.loadBookForEdit(bookId);
        } else {
          this.initializeCreateMode();
        }
      });
  }

  protected submit(): void {
    if (this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();

      return;
    }

    this.errorMessage.set(null);
    this.draftMessage.set(null);
    this.isSubmitting.set(true);

    const payload = this.buildPayload();
    const request$ =
      this.isEditMode() && this.editingBookId
        ? this.bookApiService.updateBook(this.editingBookId, payload)
        : this.bookApiService.createBook(payload);

    request$
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (book) => {
          this.syncCoverStateFromBook(book);

          if (!this.isEditMode()) {
            globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
            const nickname = this.authSessionStore.user()?.nickname ?? 'login';
            void this.router.navigateByUrl(`/${nickname}`);

            return;
          }

          void this.router.navigateByUrl(`/books/${book.id}`);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(
            error.error?.message ??
              (this.isEditMode() ? 'Не удалось обновить книгу.' : 'Не удалось создать книгу.'),
          );
        },
      });
  }

  protected saveDraftLocally(): void {
    this.draftMessage.set(
      `Черновик обновлён ${new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date())}.`,
    );
  }

  protected resetDraft(): void {
    if (this.isEditMode() && this.initialFormValue) {
      this.bookForm.reset(this.initialFormValue);
      this.resetCoverToInitial();
      this.draftMessage.set('Изменения сброшены к сохранённой версии книги.');
      this.errorMessage.set(null);

      return;
    }

    this.bookForm.reset(defaultFormValue());
    this.clearCoverState();
    this.draftMessage.set('Черновик очищен.');
    this.errorMessage.set(null);
    globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
  }

  protected uploadCover(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);
    if (!file) {
      return;
    }

    this.errorMessage.set(null);
    this.isUploadingCover.set(true);
    this.setLocalPreviewUrl(URL.createObjectURL(file));

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
          this.draftMessage.set('Обложка загружена и будет сохранена вместе с книгой.');
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось загрузить обложку.');
          this.restoreCoverPreviewAfterUploadError();
        },
      });
  }

  protected removeCover(): void {
    this.errorMessage.set(null);
    this.uploadedCoverKey.set(null);
    this.removeCoverOnSubmit.set(this.isEditMode() && this.hasInitialCover);
    this.clearPreviewUrlOnly();
    this.coverPreviewPalette.set([]);
    this.hasCover.set(false);
    this.draftMessage.set('Обложка будет удалена после сохранения.');
  }

  private initializeCreateMode(): void {
    this.initialFormValue = null;
    this.initialCoverUrl = null;
    this.initialCoverPalette = [];
    this.hasInitialCover = false;
    this.restoreDraftIfPresent();
    if (!this.isDraftWatcherAttached) {
      this.watchDraftChanges();
      this.isDraftWatcherAttached = true;
    }
    this.clearCoverState();
  }

  private restoreDraftIfPresent(): void {
    const savedDraft = globalThis.localStorage?.getItem(BOOK_DRAFT_KEY);

    if (!savedDraft) {
      return;
    }

    try {
      this.bookForm.patchValue(JSON.parse(savedDraft) as Partial<BookFormValue>);
    } catch {
      globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
    }
  }

  private watchDraftChanges(): void {
    this.bookForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!this.isEditMode()) {
          globalThis.localStorage?.setItem(BOOK_DRAFT_KEY, JSON.stringify(value));
        }
      });
  }

  private loadBookForEdit(bookId: string): void {
    this.isLoading.set(true);

    this.bookApiService
      .getBook(bookId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (book) => {
          const formValue = mapBookToFormValue(book);
          this.initialFormValue = formValue;
          this.bookForm.reset(formValue);
          this.initialCoverUrl = book.coverUrl;
          this.initialCoverPalette = book.coverPalette;
          this.hasInitialCover = Boolean(book.coverUrl);
          this.syncCoverStateFromBook(book);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось загрузить книгу.');
        },
      });
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
    this.uploadedCoverKey.set(null);
    this.removeCoverOnSubmit.set(false);
    this.setLocalPreviewUrl(null);
    this.coverPreviewUrl.set(book.coverUrl);
    this.coverPreviewPalette.set(book.coverPalette);
    this.hasCover.set(Boolean(book.coverUrl));
  }

  private resetCoverToInitial(): void {
    this.uploadedCoverKey.set(null);
    this.removeCoverOnSubmit.set(false);
    this.setLocalPreviewUrl(null);
    this.coverPreviewUrl.set(this.initialCoverUrl);
    this.coverPreviewPalette.set(this.initialCoverPalette);
    this.hasCover.set(this.hasInitialCover);
  }

  private clearCoverState(): void {
    this.uploadedCoverKey.set(null);
    this.removeCoverOnSubmit.set(false);
    this.setLocalPreviewUrl(null);
    this.coverPreviewUrl.set(null);
    this.coverPreviewPalette.set([]);
    this.hasCover.set(false);
  }

  private restoreCoverPreviewAfterUploadError(): void {
    if (this.isEditMode()) {
      this.resetCoverToInitial();
    } else {
      this.clearCoverState();
    }
  }

  private setLocalPreviewUrl(url: string | null): void {
    if (this.activeCoverObjectUrl) {
      URL.revokeObjectURL(this.activeCoverObjectUrl);
      this.activeCoverObjectUrl = null;
    }

    if (url) {
      this.activeCoverObjectUrl = url;
      this.coverPreviewUrl.set(url);

      return;
    }

    this.coverPreviewUrl.set(this.isEditMode() ? this.initialCoverUrl : null);
  }

  private clearPreviewUrlOnly(): void {
    if (this.activeCoverObjectUrl) {
      URL.revokeObjectURL(this.activeCoverObjectUrl);
      this.activeCoverObjectUrl = null;
    }

    this.coverPreviewUrl.set(null);
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

function defaultFormValue(): BookFormValue {
  return {
    title: '',
    author: '',
    genre: '',
    publisher: '',
    ageRating: '16+',
    year: new Date().getFullYear(),
    status: BOOK_STATUS_OPTIONS[6],
    isPublic: true,
    rating: null,
    description: '',
    opinion: '',
    quote: '',
  };
}
