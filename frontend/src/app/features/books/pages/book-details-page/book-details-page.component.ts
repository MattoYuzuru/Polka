import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, EMPTY, map, switchMap, tap } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { BookApiService } from '../../../../core/services/book-api.service';
import { BookDetails } from '../../../../shared/models/book.model';

@Component({
  selector: 'app-book-details-page',
  imports: [DatePipe, RouterLink, TuiButton, TuiBadge, TuiCardLarge, TuiChip, TuiHeader, TuiSurface],
  templateUrl: './book-details-page.component.html',
  styleUrl: './book-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookApiService = inject(BookApiService);

  protected readonly book = signal<BookDetails | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly backLink = computed(() => `/${this.book()?.ownerNickname ?? 'login'}`);

  protected readonly bookId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('bookId') ?? 'unknown')),
    { initialValue: 'unknown' },
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('bookId') ?? ''),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          this.book.set(null);
        }),
        switchMap((bookId) => {
          if (!bookId) {
            this.errorMessage.set('Книга не найдена.');
            this.isLoading.set(false);

            return EMPTY;
          }

          return this.bookApiService.getBook(bookId).pipe(
            tap((book) => {
              this.book.set(book);
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
  }
}
