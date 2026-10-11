import { HttpClient } from '@angular/common/http';
import { Directive, ElementRef, effect, inject, input } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthSessionStore } from '../../core/stores/auth-session.store';

@Directive({ selector: 'img[appCover]' })
export class AuthenticatedCoverDirective {
  readonly appCover = input.required<string | null>();
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionStore);

  constructor() {
    effect((onCleanup) => {
      const source = this.appCover();
      const token = this.session.token();
      this.image.removeAttribute('src');
      this.image.removeAttribute('data-cover-error');
      if (!source) {
        return;
      }

      const url = new URL(source, globalThis.location.origin);
      const isApiCover =
        url.origin === globalThis.location.origin &&
        url.pathname.startsWith(`${environment.apiBaseUrl}/books/`) &&
        url.pathname.endsWith('/cover');

      if (!isApiCover || !token) {
        this.image.src = source;
        return;
      }

      let objectUrl: string | null = null;
      const request = this.http.get(source, { responseType: 'blob' }).subscribe({
        next: (cover) => {
          objectUrl = URL.createObjectURL(cover);
          this.image.src = objectUrl;
        },
        error: () => this.image.setAttribute('data-cover-error', 'true'),
      });

      onCleanup(() => {
        request.unsubscribe();
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      });
    });
  }
}
