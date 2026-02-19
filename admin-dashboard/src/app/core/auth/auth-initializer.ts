import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { filter, take } from 'rxjs';

export function initializeAuth() {
    const auth0 = inject(AuthService);

    return () => {
        // Wait for Auth0 to complete its initialization
        return auth0.isLoading$.pipe(
            filter(loading => !loading),
            take(1)
        ).toPromise();
    };
}