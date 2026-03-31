import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

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

  protected readonly statusOptions = BOOK_STATUS_OPTIONS;
  protected readonly savedMessage = signal<string | null>(null);

  protected readonly bookForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    author: ['', [Validators.required, Validators.minLength(2)]],
    genre: ['', [Validators.required]],
    year: [2024, [Validators.required, Validators.min(0)]],
    status: [BOOK_STATUS_OPTIONS[6], [Validators.required]],
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

  protected saveDraftLocally(): void {
    if (this.bookForm.invalid) {
      this.bookForm.markAllAsTouched();

      return;
    }

    this.savedMessage.set(
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
      year: new Date().getFullYear(),
      status: BOOK_STATUS_OPTIONS[6],
      rating: null,
      description: '',
      opinion: '',
      quote: '',
    });
    this.savedMessage.set('Черновик очищен.');
    globalThis.localStorage?.removeItem(BOOK_DRAFT_KEY);
  }
}
