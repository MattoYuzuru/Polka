import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { debounceTime, finalize } from 'rxjs';
import { TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { ProfileApiService } from '../../../../core/services/profile-api.service';
import { RecommendationListApiService } from '../../../../core/services/recommendation-list-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { BookCard } from '../../../../shared/models/book.model';
import {
  RecommendationListDetails,
  RecommendationListFormValue,
} from '../../../../shared/models/recommendation-list.model';

const LIST_DRAFT_KEY = 'polka.lists.create-draft';

@Component({
  selector: 'app-list-form-page',
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
  templateUrl: './list-form-page.component.html',
  styleUrl: './list-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly recommendationListApiService = inject(RecommendationListApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly books = signal<BookCard[]>([]);
  protected readonly selectedCount = computed(() => this.listForm.controls.bookIds.value.length);

  protected readonly listForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isPublic: [true],
    bookIds: [[] as string[], [Validators.required, Validators.minLength(2)]],
  });

  constructor() {
    this.restoreDraftIfPresent();
    this.watchDraftChanges();
    this.loadBooks();
  }

  protected isSelected(bookId: string): boolean {
    return this.listForm.controls.bookIds.value.includes(bookId);
  }

  protected toggleBook(bookId: string): void {
    const selected = this.listForm.controls.bookIds.value;
    const nextSelected = selected.includes(bookId)
      ? selected.filter((value) => value !== bookId)
      : [...selected, bookId];

    this.listForm.controls.bookIds.setValue(nextSelected);
    this.listForm.controls.bookIds.markAsDirty();
    this.listForm.controls.bookIds.updateValueAndValidity();
  }

  protected submit(): void {
    if (this.listForm.invalid) {
      this.listForm.markAllAsTouched();

      return;
    }

    this.errorMessage.set(null);
    this.draftMessage.set(null);
    this.isSubmitting.set(true);

    this.recommendationListApiService
      .createList(this.listForm.getRawValue())
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (recommendationList) => {
          globalThis.localStorage?.removeItem(LIST_DRAFT_KEY);
          void this.router.navigateByUrl(`/lists/${recommendationList.id}`);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось создать список рекомендаций.');
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
    this.listForm.reset({
      title: '',
      description: '',
      isPublic: true,
      bookIds: [],
    });
    globalThis.localStorage?.removeItem(LIST_DRAFT_KEY);
    this.draftMessage.set('Черновик очищен.');
    this.errorMessage.set(null);
  }

  private loadBooks(): void {
    const nickname = this.authSessionStore.user()?.nickname;

    if (!nickname) {
      this.errorMessage.set('Сначала войдите в аккаунт.');
      this.isLoading.set(false);

      return;
    }

    this.profileApiService
      .getPublicProfile(nickname)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.books.set(profile.books);

          const availableBookIDs = new Set(profile.books.map((book) => book.id));
          const filteredSelectedBooks = this.listForm.controls.bookIds.value.filter((bookId) =>
            availableBookIDs.has(bookId),
          );

          if (filteredSelectedBooks.length !== this.listForm.controls.bookIds.value.length) {
            this.listForm.controls.bookIds.setValue(filteredSelectedBooks);
          }
        },
        error: () => {
          this.errorMessage.set('Не удалось загрузить библиотеку для составления списка.');
        },
      });
  }

  private restoreDraftIfPresent(): void {
    const savedDraft = globalThis.localStorage?.getItem(LIST_DRAFT_KEY);

    if (!savedDraft) {
      return;
    }

    try {
      this.listForm.patchValue(JSON.parse(savedDraft) as Partial<RecommendationListFormValue>);
    } catch {
      globalThis.localStorage?.removeItem(LIST_DRAFT_KEY);
    }
  }

  private watchDraftChanges(): void {
    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        globalThis.localStorage?.setItem(LIST_DRAFT_KEY, JSON.stringify(value));
      });
  }
}
