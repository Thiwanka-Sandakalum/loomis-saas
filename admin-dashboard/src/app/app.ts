import { OnboardingStatusService } from './core/services/onboarding-status.service';
import { Router } from '@angular/router';
import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { AppPreloaderComponent } from './shared/components/app-preloader.component';


@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, AppPreloaderComponent],
  template: `
    <ng-container *ngIf="loading(); else loaded">
      <app-preloader />
    </ng-container>
    <ng-template #loaded>
      <router-outlet />
    </ng-template>
  `
})
export class App {
  protected auth = inject(AuthService);
  private onboardingStatus = inject(OnboardingStatusService);
  private router = inject(Router);
  loading = signal(true);

  constructor() {
    effect(() => {
      this.auth.isAuthenticated$.subscribe(async (isAuth) => {
        if (isAuth) {
          this.loading.set(true);
          const status = await this.onboardingStatus.checkStatus();
          let navPromise: Promise<boolean> | null = null;
          if (status === 'profile') {
            navPromise = this.router.navigate(['/onboarding/company-setup']);
          } else if (status === 'rates') {
            navPromise = this.router.navigate(['/onboarding/service-rates']);
          }
          if (navPromise) {
            navPromise.finally(() => this.loading.set(false));
          } else {
            // No navigation needed (dashboard), so loading can end
            this.loading.set(false);
          }
        } else {
          this.loading.set(false);
        }
      });
    });
  }
}
