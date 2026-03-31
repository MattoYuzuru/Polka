import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { BookApiService } from '../../../../core/services/book-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import {
  type BooksImportPayload,
  type CreateBookPayload,
} from '../../../../shared/models/book.model';

@Component({
  selector: 'app-book-import-page',
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
  templateUrl: './book-import-page.component.html',
  styleUrl: './book-import-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookImportPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly bookApiService = inject(BookApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly importShapeHint = '{ "items": [...] }';
  protected readonly importPlaceholder =
    '[{"title":"...","author":"...","genre":"...","status":"Хочу"}]';
  protected readonly exampleJson = `[
  {
    "title": "Snow Crash",
    "author": "Neal Stephenson",
    "genre": "Киберпанк",
    "year": 1992,
    "publisher": "Bantam Books",
    "status": "Прочитал",
    "rating": 9,
    "description": "Роман о метавселенной.",
    "opinion": "Плотный и быстрый текст.",
    "quote": "The Deliverator belongs to an elite order."
  }
]`;

  protected readonly importForm = this.formBuilder.nonNullable.group({
    rawJson: ['', [Validators.required, Validators.minLength(2)]],
  });

  protected submit(): void {
    if (this.importForm.invalid) {
      this.importForm.markAllAsTouched();

      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    let payload: BooksImportPayload;
    try {
      payload = normalizeImportPayload(this.importForm.controls.rawJson.getRawValue());
    } catch {
      this.errorMessage.set('Не удалось распарсить JSON. Проверьте структуру данных.');

      return;
    }

    this.isSubmitting.set(true);
    this.bookApiService
      .importBooks(payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.successMessage.set(`Импортировано книг: ${result.importedCount}.`);
          const nickname = this.authSessionStore.user()?.nickname;

          if (nickname) {
            void this.router.navigateByUrl(`/${nickname}`);
          }
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось импортировать книги из JSON.');
        },
      });
  }

  protected async fillFromFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);
    if (!file) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.importForm.controls.rawJson.setValue(await file.text());

    if (input) {
      input.value = '';
    }
  }
}

function normalizeImportPayload(rawJson: string): BooksImportPayload {
  const parsed = JSON.parse(rawJson) as unknown;

  if (Array.isArray(parsed)) {
    return { items: parsed.map(normalizeBookItem) };
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    'items' in parsed &&
    Array.isArray((parsed as { items: unknown[] }).items)
  ) {
    return {
      items: (parsed as { items: unknown[] }).items.map(normalizeBookItem),
    };
  }

  return {
    items: [normalizeBookItem(parsed)],
  };
}

function normalizeBookItem(rawValue: unknown): CreateBookPayload {
  const value = (
    rawValue && typeof rawValue === 'object' ? rawValue : {}
  ) as Partial<CreateBookPayload>;

  return {
    title: `${value.title ?? ''}`.trim(),
    author: `${value.author ?? ''}`.trim(),
    description: `${value.description ?? ''}`.trim(),
    year: Number(value.year ?? new Date().getFullYear()),
    publisher: `${value.publisher ?? ''}`.trim(),
    ageRating: `${value.ageRating ?? ''}`.trim(),
    genre: `${value.genre ?? ''}`.trim(),
    isPublic: value.isPublic ?? true,
    status: (value.status as CreateBookPayload['status']) ?? 'Хочу',
    rating: typeof value.rating === 'number' ? value.rating : null,
    opinion: `${value.opinion ?? ''}`.trim(),
    quote: `${value.quote ?? ''}`.trim(),
    coverPalette: Array.isArray(value.coverPalette)
      ? value.coverPalette.map((item) => `${item}`.trim())
      : [],
    coverObjectKey: typeof value.coverObjectKey === 'string' ? value.coverObjectKey : null,
    removeCover: false,
  };
}
