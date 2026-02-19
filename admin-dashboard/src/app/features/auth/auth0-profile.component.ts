import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Auth0Service } from '../../core/auth/sso-auth.service';

@Component({
    selector: 'app-auth0-profile',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex items-center gap-3 rounded-xl bg-white/50 p-3 shadow-sm border border-slate-200/50 dark:bg-slate-800/50 dark:border-slate-700/50">
            <!-- Avatar -->
            <div class="relative">
                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary/90 to-purple-600 flex items-center justify-center shadow-sm">
                    @if (userInitial()) {
                        <span class="text-sm font-bold text-white">{{ userInitial() }}</span>
                    } @else {
                        <span class="material-symbols-outlined text-lg text-white">person</span>
                    }
                </div>
                <!-- Online Status Indicator -->
                <div class="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></div>
            </div>
            
            <!-- User Info -->
            <div class="flex-1 min-w-0 text-left">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ displayName() }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ userEmail() }}</p>
            </div>
            
            <!-- Logout Button -->
            <button 
                (click)="logout()"
                class="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                title="Sign Out"
            >
                <span class="material-symbols-outlined text-lg">logout</span>
            </button>
        </div>
    `
})
export default class Auth0ProfileComponent {
    private auth0Service = inject(Auth0Service);

    private userProfile = computed(() => this.auth0Service.getUserProfile());

    displayName = computed(() => {
        const profile = this.userProfile();
        return profile?.name || profile?.given_name || 'Admin User';
    });

    userEmail = computed(() => {
        const profile = this.userProfile();
        return profile?.email || 'admin@loomiscourier.com';
    });

    userInitial = computed(() => {
        const name = this.displayName();
        return name?.charAt(0).toUpperCase() || 'A';
    });

    logout(): void {
        this.auth0Service.logout();
    }
}