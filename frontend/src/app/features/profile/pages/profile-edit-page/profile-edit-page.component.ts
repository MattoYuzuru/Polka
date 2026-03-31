import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, tap } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { ProfileApiService } from '../../../../core/services/profile-api.service';
import { AuthSessionStore } from '../../../../core/stores/auth-session.store';

@Component({
  selector: 'app-profile-edit-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TuiButton,
    TuiCardLarge,
    TuiChip,
    TuiHeader,
    TuiSurface,
  ],
  templateUrl: './profile-edit-page.component.html',
  styleUrl: './profile-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEditPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly profileApiService = inject(ProfileApiService);
  protected readonly authSessionStore = inject(AuthSessionStore);

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    nickname: ['', [Validators.required, Validators.minLength(3)]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    tagline: ['', [Validators.maxLength(280)]],
  });

  constructor() {
    this.profileApiService
      .getEditableProfile()
      .pipe(
        tap((editableProfile) => {
          this.profileForm.patchValue({
            nickname: editableProfile.nickname,
            displayName: editableProfile.displayName,
            tagline: editableProfile.tagline,
          });
          this.isLoading.set(false);
        }),
        catchError((error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось загрузить данные профиля.');
          this.isLoading.set(false);

          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected submit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();

      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    this.profileApiService
      .updateProfile(this.profileForm.getRawValue())
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (editableProfile) => {
          const currentUser = this.authSessionStore.user();

          if (currentUser) {
            this.authSessionStore.updateUser({
              ...currentUser,
              nickname: editableProfile.nickname,
              email: editableProfile.email,
            });
          }

          this.successMessage.set('Профиль сохранён.');
          void this.router.navigateByUrl(`/${editableProfile.nickname}`);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message ?? 'Не удалось сохранить профиль.');
        },
      });
  }
}
