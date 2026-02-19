import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Auth0Service } from '../../core/auth/sso-auth.service';

@Component({
    selector: 'app-login-button',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button 
            (click)="loginWithRedirect()" 
            class="w-full flex items-center justify-center gap-3 rounded-lg bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 active:scale-[0.98]"
        >
            <span class="material-symbols-outlined text-xl">login</span>
            Sign in to Admin Dashboard
        </button>
        
        <!-- Alternative Authentication Methods (Future) -->
        <div class="mt-4 text-center">
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Or continue with
            </p>
            <div class="flex justify-center gap-3">
                <button 
                    disabled
                    class="flex items-center justify-center h-11 w-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    title="Coming soon"
                >
                    <span class="material-symbols-outlined text-lg">fingerprint</span>
                </button>
                <button 
                    disabled
                    class="flex items-center justify-center h-11 w-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    title="Coming soon"
                >
                    <span class="material-symbols-outlined text-lg">key</span>
                </button>
                <button 
                    disabled
                    class="flex items-center justify-center h-11 w-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    title="Coming soon"
                >
                    <span class="material-symbols-outlined text-lg">smartphone</span>
                </button>
            </div>
        </div>
    `
})
export default class LoginButtonComponent {
    private auth0Service = inject(Auth0Service);

    loginWithRedirect(): void {
        this.auth0Service.login();
    }
}