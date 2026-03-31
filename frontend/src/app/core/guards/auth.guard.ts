import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthSessionStore } from '../stores/auth-session.store';

export const authGuard: CanActivateFn = () => {
  const authSessionStore = inject(AuthSessionStore);
  const router = inject(Router);

  authSessionStore.bootstrap();

  if (authSessionStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
