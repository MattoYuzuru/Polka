import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { BookApiService } from '../../../../core/services/book-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { BOOK_STATUS_OPTIONS } from '../../../../shared/data/book-form.constants';
import { type BookDetails, type BookFormValue } from '../../../../shared/models/book.model';

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

  protected readonly statusOptions = BOOK_STATUS_OPTIONS;
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isEditMode = signal(false);

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
          this.restoreDraftIfPresent();
          this.watchDraftChanges();
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

    const request$ =
      this.isEditMode() && this.editingBookId
        ? this.bookApiService.updateBook(this.editingBookId, this.bookForm.getRawValue())
        : this.bookApiService.createBook(this.bookForm.getRawValue());

    request$
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (book) => {
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
    this.bookForm.reset({
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
    });
    this.draftMessage.set('Черновик очищен.');
    this.errorMessage.set(null);

    if (!this.isEditMode()) {
      globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
    }
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
          this.bookForm.reset(mapBookToFormValue(book));
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось загрузить книгу.');
        },
      });
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
