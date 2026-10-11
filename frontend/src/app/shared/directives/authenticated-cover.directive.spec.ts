import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { authTokenInterceptor } from '../../core/interceptors/auth-token.interceptor';
import { AuthSessionStore } from '../../core/stores/auth-session.store';
import { AuthenticatedCoverDirective } from './authenticated-cover.directive';

@Component({
  imports: [AuthenticatedCoverDirective],
  template: '<img [appCover]="source()" alt="Обложка" />',
})
class CoverHostComponent {
  readonly source = signal('/api/v1/books/private-book/cover');
}

describe('AuthenticatedCoverDirective', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CoverHostComponent],
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    URL.createObjectURL = jest.fn(() => 'blob:private-cover');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads an owner cover with authorization and revokes the blob on teardown', () => {
    TestBed.inject(AuthSessionStore).setSession({
      token: 'owner-token',
      user: {
        id: 'owner',
        nickname: 'reader',
        email: 'reader@example.com',
        createdAt: '2024-01-01',
      },
    });
    const fixture = TestBed.createComponent(CoverHostComponent);
    fixture.detectChanges();
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/books/private-book/cover',
    );
    expect(request.request.headers.get('Authorization')).toBe('Bearer owner-token');
    request.flush(new Blob(['cover'], { type: 'image/png' }));
    expect(fixture.nativeElement.querySelector('img').src).toBe('blob:private-cover');
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-cover');
  });

  it('leaves public guest images to the browser without an HTTP blob request', () => {
    const fixture = TestBed.createComponent(CoverHostComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/books/private-book/cover');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      '/api/v1/books/private-book/cover',
    );
  });

  it('does not send credentials to an external cover origin', () => {
    TestBed.inject(AuthSessionStore).setSession({
      token: 'owner-token',
      user: {
        id: 'owner',
        nickname: 'reader',
        email: 'reader@example.com',
        createdAt: '2024-01-01',
      },
    });
    const fixture = TestBed.createComponent(CoverHostComponent);
    fixture.componentInstance.source.set('https://example.com/cover.png');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectNone('https://example.com/cover.png');
    expect(fixture.nativeElement.querySelector('img').src).toBe('https://example.com/cover.png');
  });
});
