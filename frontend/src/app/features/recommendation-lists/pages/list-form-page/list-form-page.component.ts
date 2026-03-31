import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly recommendationListApiService = inject(RecommendationListApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);

  private editingListId: string | null = null;
  private draftWatcherInitialized = false;

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly currentListId = signal<string | null>(null);
  protected readonly books = signal<BookCard[]>([]);
  protected readonly selectedCount = computed(() => this.listForm.controls.bookIds.value.length);

  protected readonly listForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isPublic: [true],
    bookIds: [[] as string[], [Validators.required, Validators.minLength(2)]],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('listId')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((listId) => {
        this.editingListId = listId;
        this.currentListId.set(listId);
        this.isEditMode.set(Boolean(listId));
        this.isLoading.set(true);
        this.errorMessage.set(null);

        if (!listId) {
          this.restoreDraftIfPresent();
          this.watchDraftChanges();
          this.loadBooks();

          return;
        }

        this.loadBooks(listId);
      });
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

    const request$ = this.isEditMode() && this.editingListId
      ? this.recommendationListApiService.updateList(this.editingListId, this.listForm.getRawValue())
      : this.recommendationListApiService.createList(this.listForm.getRawValue());

    request$
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (recommendationList) => {
          if (!this.isEditMode()) {
            globalThis.localStorage?.removeItem(LIST_DRAFT_KEY);
          }

          void this.router.navigateByUrl(`/lists/${recommendationList.id}`);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(
            error.error?.message ??
              (this.isEditMode()
                ? 'Не удалось обновить список рекомендаций.'
                : 'Не удалось создать список рекомендаций.'),
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
    this.listForm.reset({
      title: '',
      description: '',
      isPublic: true,
      bookIds: [],
    });

    if (!this.isEditMode()) {
      globalThis.localStorage?.removeItem(LIST_DRAFT_KEY);
    }

    this.draftMessage.set('Черновик очищен.');
    this.errorMessage.set(null);
  }

  private loadBooks(listId?: string): void {
    const nickname = this.authSessionStore.user()?.nickname;

    if (!nickname) {
      this.errorMessage.set('Сначала войдите в аккаунт.');
      this.isLoading.set(false);

      return;
    }

    this.profileApiService
      .getPublicProfile(nickname)
      .pipe(
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

          if (listId) {
            this.loadListForEdit(listId);

            return;
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Не удалось загрузить библиотеку для составления списка.');
          this.isLoading.set(false);
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
    if (this.draftWatcherInitialized) {
      return;
    }

    this.draftWatcherInitialized = true;

    this.listForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!this.isEditMode()) {
          globalThis.localStorage?.setItem(LIST_DRAFT_KEY, JSON.stringify(value));
        }
      });
  }

  private loadListForEdit(listId: string): void {
    this.recommendationListApiService
      .getList(listId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (recommendationList) => {
          this.listForm.reset(mapRecommendationListToFormValue(recommendationList));
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(
            error.error?.message ?? 'Не удалось загрузить список рекомендаций для редактирования.',
          );
        },
      });
  }
}

function mapRecommendationListToFormValue(
  recommendationList: RecommendationListDetails,
): RecommendationListFormValue {
  return {
    title: recommendationList.title,
    description: recommendationList.description,
    isPublic: recommendationList.isPublic,
    bookIds: recommendationList.books.map((book) => book.id),
  };
}
