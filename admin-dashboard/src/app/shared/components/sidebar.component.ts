import { Component, input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService as Auth0AuthService } from '@auth0/auth0-angular';
import { AuthService } from '../../core/services/auth.service';
import { computed, signal } from '@angular/core';
import { useInquiryData } from '../../features/inquiries/composables/use-inquiry-data';
import Auth0ProfileComponent from '../../features/auth/auth0-profile.component';
import { Auth0Service } from '../../core/auth/sso-auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Auth0ProfileComponent, CommonModule],
  template: `
    <aside class="flex h-screen w-72 flex-col justify-between border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 fixed left-0 top-0 z-20 overflow-y-auto">
      <div class="flex flex-col gap-6">
        <!-- Branding -->
        <div class="flex items-center gap-3 px-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <span class="material-symbols-outlined text-2xl">local_shipping</span>
          </div>
          <div class="flex flex-col">
            <h1 class="text-base font-bold leading-tight text-slate-900 dark:text-white">{{ companyName() }}</h1>
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ platformLabel() }}</p>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex flex-col gap-1">
          @for (item of navItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300"
              #rla="routerLinkActive"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <span 
                class="material-symbols-outlined text-[20px]"
                [class.fill-1]="rla.isActive"
              >
                {{ item.icon }}
              </span>
              <span class="text-sm" [class.font-semibold]="rla.isActive" [class.font-medium]="!rla.isActive">
                {{ item.label }}
              </span>
              @if (item.badge) {
                <span class="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {{ item.badge }}
                </span>
              }
            </a>
          }
        </nav>
      </div>

        <!-- Bottom Actions -->
      <div class="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <a 
          routerLink="/settings" 
          routerLinkActive="bg-primary/10 text-primary"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        >
          <span class="material-symbols-outlined text-[20px]">settings</span>
          <span class="text-sm font-medium">Settings</span>
        </a>

        <!-- Auth0 User Profile -->
        @if (auth0.isAuthenticated$ | async) {
          <div class="px-2">
            <app-auth0-profile />
          </div>
        }
      </div>
    </aside>
  `,
})
export class SidebarComponent {

  auth0 = inject(Auth0AuthService);
  auth0Service = inject(Auth0Service);
  private tenantService = inject(AuthService);

  // Company/platform name signals
  companyName = computed(() => {
    const tenant = this.tenantService.currentTenant();
    return tenant?.companyName || 'Your Platform';
  });
  platformLabel = computed(() => {
    const tenant = this.tenantService.currentTenant();
    return tenant?.isOnboardingComplete ? 'Courier Platform' : 'Admin Platform';
  });

  // Inquiry badge signal
  private inquiryStats = useInquiryData().stats;
  inquiryBadge = computed(() => {
    const stats = this.inquiryStats();
    return (stats.open || 0) + (stats.in_progress || 0);
  });

  navItems = input<NavItem[]>([{
    label: 'Dashboard', icon: 'grid_view', route: '/dashboard'
  }, {
    label: 'Shipments', icon: 'package_2', route: '/shipments'
  }, {
    label: 'Inquiries', icon: 'chat_bubble', route: '/inquiries', badge: this.inquiryBadge()
  }, {
    label: 'Integrations', icon: 'extension', route: '/integrations'
  }, {
    label: 'AI Agent', icon: 'smart_toy', route: '/ai-agent'
  }]);

  signOut() {
    this.auth0Service.logout();
  }
}