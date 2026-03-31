import { type Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (module) => module.LoginPageComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register-page/register-page.component').then(
        (module) => module.RegisterPageComponent,
      ),
  },
  {
    path: 'books/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/books/pages/book-form-page/book-form-page.component').then(
        (module) => module.BookFormPageComponent,
      ),
  },
  {
    path: 'books/:bookId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/books/pages/book-form-page/book-form-page.component').then(
        (module) => module.BookFormPageComponent,
      ),
  },
  {
    path: 'books/:bookId',
    loadComponent: () =>
      import('./features/books/pages/book-details-page/book-details-page.component').then(
        (module) => module.BookDetailsPageComponent,
      ),
  },
  {
    path: 'lists/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/recommendation-lists/pages/list-form-page/list-form-page.component').then(
        (module) => module.ListFormPageComponent,
      ),
  },
  {
    path: 'lists/:listId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/recommendation-lists/pages/list-form-page/list-form-page.component').then(
        (module) => module.ListFormPageComponent,
      ),
  },
  {
    path: 'lists/:listId',
    loadComponent: () =>
      import('./features/recommendation-lists/pages/list-details-page/list-details-page.component').then(
        (module) => module.ListDetailsPageComponent,
      ),
  },
  {
    path: 'settings/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/profile-edit-page/profile-edit-page.component').then(
        (module) => module.ProfileEditPageComponent,
      ),
  },
  {
    path: ':nickname',
    loadComponent: () =>
      import('./features/profile/pages/profile-page/profile-page.component').then(
        (module) => module.ProfilePageComponent,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
