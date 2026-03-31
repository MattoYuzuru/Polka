import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

@Component({
  selector: 'app-list-form-page',
  imports: [RouterLink, TuiButton, TuiCardLarge, TuiChip, TuiHeader, TuiSurface],
  templateUrl: './list-form-page.component.html',
  styleUrl: './list-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFormPageComponent {}
