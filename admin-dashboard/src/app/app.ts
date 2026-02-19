import { OnboardingStatusService } from './core/services/onboarding-status.service';
import { Router } from '@angular/router';
import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';


@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet,],
  template: `
    <router-outlet />
  `
})
export class App {
  protected auth = inject(AuthService);

  private onboardingStatus = inject(OnboardingStatusService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      this.auth.isAuthenticated$.subscribe(async (isAuth) => {
        if (isAuth) {
          const status = await this.onboardingStatus.checkStatus();
          if (status === 'profile') {
            this.router.navigate(['/onboarding/company-setup']);
          } else if (status === 'rates') {
            this.router.navigate(['/onboarding/service-rates']);
          } else if (status === 'complete') {
            // Stay on dashboard
          }
        }
      });
    });
  }
}
