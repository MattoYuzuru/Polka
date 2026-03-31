import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the application shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('renders taiga root', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('tui-root')).not.toBeNull();
  });
});
