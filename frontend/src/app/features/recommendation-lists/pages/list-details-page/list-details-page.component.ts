import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, map, switchMap, tap } from 'rxjs';
import { TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { RecommendationListApiService } from '../../../../core/services/recommendation-list-api.service';
import { RecommendationListDetails } from '../../../../shared/models/recommendation-list.model';

@Component({
  selector: 'app-list-details-page',
  imports: [
    DatePipe,
    RouterLink,
    TuiBadge,
    TuiButton,
    TuiCardLarge,
    TuiChip,
    TuiHeader,
    TuiSurface,
  ],
  templateUrl: './list-details-page.component.html',
  styleUrl: './list-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recommendationListApiService = inject(RecommendationListApiService);

  protected readonly recommendationList = signal<RecommendationListDetails | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly backLink = computed(
    () => `/${this.recommendationList()?.ownerNickname ?? 'login'}`,
  );

  protected readonly listId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('listId') ?? 'unknown')),
    { initialValue: 'unknown' },
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('listId') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.recommendationList.set(null);
        }),
        switchMap((listId) => {
          if (!listId) {
            this.errorMessage.set('Список рекомендаций не найден.');
            this.isLoading.set(false);

            return EMPTY;
          }

          return this.recommendationListApiService.getList(listId).pipe(
            tap((recommendationList) => {
              this.recommendationList.set(recommendationList);
              this.isLoading.set(false);
            }),
            catchError(() => {
              this.errorMessage.set('Не удалось загрузить список рекомендаций.');
              this.isLoading.set(false);

              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected copyLink(): void {
    const clipboard = globalThis.navigator?.clipboard;

    if (!clipboard) {
      return;
    }

    void clipboard.writeText(globalThis.location?.href ?? '').then(() => {
      this.copied.set(true);
      globalThis.setTimeout(() => this.copied.set(false), 1800);
    });
  }
}
