import { AuthenticatedCoverDirective } from '../../../../shared/directives/authenticated-cover.directive';
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
import { distinctUntilChanged, finalize, map } from 'rxjs';
import { TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { ProfileApiService } from '../../../../core/services/profile-api.service';
import { RecommendationListApiService } from '../../../../core/services/recommendation-list-api.service';
import { readLocalValue, writeLocalValue } from '../../../../core/utils/local-storage';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';
import { UiPreferencesStore } from '../../../../core/stores/ui-preferences.store';
import { type BookCard } from '../../../../shared/models/book.model';
import {
  type RecommendationListDetails,
  type RecommendationListFormValue,
} from '../../../../shared/models/recommendation-list.model';

const LIST_DRAFT_KEY = 'polka.lists.create-draft';

@Component({
  selector: 'app-list-form-page',
  imports: [
    AuthenticatedCoverDirective,
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
  protected readonly uiPreferencesStore = inject(UiPreferencesStore);

  private editingListId: string | null = null;
  private draftWatcherInitialized = false;

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly currentListId = signal<string | null>(null);
  protected readonly books = signal<BookCard[]>([]);
  protected selectedCount(): number {
    return this.listForm.controls.bookIds.value.length;
  }
  protected readonly accentGradientCss = computed(() =>
    this.uiPreferencesStore.profileGradientCss(),
  );

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

    if (this.isSubmitting()) return;
    this.listForm.controls.bookIds.setValue(nextSelected);
    this.listForm.controls.bookIds.markAsDirty();
    this.listForm.controls.bookIds.updateValueAndValidity();
  }

  protected selectionOrder(bookId: string): number | null {
    const index = this.listForm.controls.bookIds.value.indexOf(bookId);

    return index === -1 ? null : index + 1;
  }

  protected submit(): void {
    if (this.isSubmitting()) return;
    if (this.listForm.invalid) {
      this.listForm.markAllAsTouched();

      return;
    }

    this.errorMessage.set(null);
    this.draftMessage.set(null);
    this.isSubmitting.set(true);

    const request$ =
      this.isEditMode() && this.editingListId
        ? this.recommendationListApiService.updateList(
            this.editingListId,
            this.listForm.getRawValue(),
          )
        : this.recommendationListApiService.createList(this.listForm.getRawValue());

    request$
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (recommendationList) => {
          if (!this.isEditMode()) {
            writeLocalValue(this.draftKey(), null);
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
    if (!writeLocalValue(this.draftKey(), JSON.stringify(this.listForm.getRawValue()))) {
      this.draftMessage.set('Браузер не позволяет сохранить черновик. Оставьте вкладку открытой.');
      return;
    }
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
      writeLocalValue(this.draftKey(), null);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  private draftKey(): string {
    return `${LIST_DRAFT_KEY}.${this.authSessionStore.user()?.id ?? 'anonymous'}`;
  }

  private restoreDraftIfPresent(): void {
    const savedDraft = readLocalValue(this.draftKey());

    if (!savedDraft) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(savedDraft);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Invalid draft');
      const value = parsed as Record<string, unknown>;
      this.listForm.patchValue(
        {
          title: typeof value['title'] === 'string' ? value['title'] : '',
          description: typeof value['description'] === 'string' ? value['description'] : '',
          isPublic: typeof value['isPublic'] === 'boolean' ? value['isPublic'] : true,
          bookIds: Array.isArray(value['bookIds'])
            ? value['bookIds'].filter((id): id is string => typeof id === 'string')
            : [],
        },
        { emitEvent: false },
      );
    } catch {
      writeLocalValue(this.draftKey(), null);
    }
  }

  private watchDraftChanges(): void {
    if (this.draftWatcherInitialized) {
      return;
    }

    this.draftWatcherInitialized = true;

    this.listForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (!this.isEditMode()) {
        writeLocalValue(this.draftKey(), JSON.stringify(value));
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
