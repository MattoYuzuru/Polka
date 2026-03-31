import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, finalize } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { BookApiService } from '../../../../core/services/book-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { BOOK_STATUS_OPTIONS } from '../../../../shared/data/book-form.constants';

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
  private readonly bookApiService = inject(BookApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);

  protected readonly statusOptions = BOOK_STATUS_OPTIONS;
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

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
    const savedDraft = globalThis.localStorage?.getItem(BOOK_DRAFT_KEY);

    if (savedDraft) {
      try {
        this.bookForm.patchValue(JSON.parse(savedDraft) as Partial<typeof this.bookForm.value>);
      } catch {
        globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
      }
    }

    this.bookForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        globalThis.localStorage?.setItem(BOOK_DRAFT_KEY, JSON.stringify(value));
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

    this.bookApiService
      .createBook(this.bookForm.getRawValue())
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);

          const nickname = this.authSessionStore.user()?.nickname ?? 'login';
          void this.router.navigateByUrl(`/${nickname}`);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось создать книгу.');
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
    globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
  }
}
