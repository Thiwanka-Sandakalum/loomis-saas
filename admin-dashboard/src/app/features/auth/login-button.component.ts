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
        
    `
})
export default class LoginButtonComponent {
    private auth0Service = inject(Auth0Service);

    loginWithRedirect(): void {
        this.auth0Service.login();
    }
}