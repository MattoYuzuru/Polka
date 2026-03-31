import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

@Component({
  selector: 'app-book-details-page',
  imports: [RouterLink, TuiButton, TuiCardLarge, TuiChip, TuiHeader, TuiSurface],
  templateUrl: './book-details-page.component.html',
  styleUrl: './book-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly bookId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('bookId') ?? 'unknown')),
    { initialValue: 'unknown' },
  );
}
