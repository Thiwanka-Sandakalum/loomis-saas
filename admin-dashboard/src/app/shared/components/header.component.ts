import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { Auth0Service } from '../../core/auth/sso-auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule],
  template: `
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <!-- Search Bar -->
        <div class="flex-1 max-w-xl">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="search"
              placeholder="Search shipments, customers..."
              class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
            />
          </div>
        </div>

        <!-- Right Actions -->
        <div class="flex items-center gap-4">
          <!-- Notifications -->
          <button 
            class="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            (click)="toggleNotifications()"
          >
            <span class="material-symbols-outlined">notifications</span>
            @if (unreadCount() > 0) {
              <span class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
                {{ unreadCount() }}
              </span>
            }
          </button>

          <!-- User Menu -->
          @if (auth0.isAuthenticated$ | async) {
            <div class="relative">
              <button
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                (click)="toggleUserMenu()"
              >
              <div class="h-8 w-8 overflow-hidden rounded-full bg-slate-200">
                <img 
                  alt="User" 
                  class="h-full w-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlPZjMERZYh3RTtljnWwcKywo1UJIOvNGAeJ4bMy6ujYKqiAbKJXMpdGUnIqDmequGC59N84oWNWuWMgAolzMeA9yiTUDmm4GQJpSiXBYf6fAbRv7HN4Eiz86CctOVgnleB8G8839RJfR6ynGbYMRvfFwZmf_D1VjbmoJjWqtOuK2aGeqyR4LiS20ZbMle4bfhibZvF1in7IifNQFCsYYfINaRa2Jwb0V8oYODNqaTcXzbnFiZz4GPGRhwUsVD9-bINCDDdicfmhUk"
                />
              </div>
              <div class="hidden text-left md:block">
                @if (auth0.user$ | async; as user) {
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ user.name || user.email }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Admin User</p>
                } @else {
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">User</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Loading...</p>
                }
              </div>
              <span class="material-symbols-outlined text-slate-400">
                {{ showUserMenu() ? 'expand_less' : 'expand_more' }}
              </span>
            </button>

            <!-- User Dropdown Menu -->
            @if (showUserMenu()) {
              <div class="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div class="p-3 border-b border-slate-200 dark:border-slate-800">
                  @if (auth0.user$ | async; as user) {
                    <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ user.name || user.email }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
                  } @else {
                    <p class="text-sm font-semibold text-slate-900 dark:text-white">User</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">user@example.com</p>
                  }
                </div>
                <div class="py-2">
                  <a routerLink="/settings" class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <span class="material-symbols-outlined text-[18px]">settings</span>
                    Settings
                  </a>
                  <a routerLink="/help" class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <span class="material-symbols-outlined text-[18px]">help</span>
                    Help & Support
                  </a>
                  @if (auth0.isAuthenticated$ | async) {
                    <button 
                      (click)="logout()"
                      class="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <span class="material-symbols-outlined text-[18px]">logout</span>
                      Logout
                    </button>
                  }
                </div>
              </div>
            }
          </div>
          }
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  auth0 = inject(AuthService);
  private auth0Service = inject(Auth0Service);
  private router = inject(Router);

  showUserMenu = signal(false);
  showNotifications = signal(false);
  unreadCount = signal(3);

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
    this.showNotifications.set(false);
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.auth0Service.logout();
  }
}
