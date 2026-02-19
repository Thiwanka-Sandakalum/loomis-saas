import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService as Auth0AuthService } from '@auth0/auth0-angular';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class Auth0Service {
    private auth0 = inject(Auth0AuthService);
    private router = inject(Router);

    // Reactive signals for authentication state
    private isLoggedIn = signal(false);
    private userProfile = signal<any>(null);

    // Computed properties
    isAuthenticated = computed(() => this.isLoggedIn());
    user = computed(() => this.userProfile());

    constructor() {
        // Subscribe to Auth0 authentication state changes
        this.auth0.isAuthenticated$.subscribe(isAuth => {
            this.isLoggedIn.set(isAuth);
        });

        // Subscribe to user profile changes
        this.auth0.user$.subscribe(user => {
            this.userProfile.set(user);
        });
    }

    login(): void {
        this.auth0.loginWithRedirect({
            appState: { target: '/dashboard' }
        });
    }

    logout(): void {
        this.auth0.logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        });
    }

    getAccessToken() {
        return this.auth0.getAccessTokenSilently();
    }

    getUserProfile(): any {
        return this.userProfile();
    }

    // Observable streams for reactive programming
    get isAuthenticated$() {
        return this.auth0.isAuthenticated$;
    }

    get user$() {
        return this.auth0.user$;
    }

    get isLoading$() {
        return this.auth0.isLoading$;
    }

    get error$() {
        return this.auth0.error$;
    }
}