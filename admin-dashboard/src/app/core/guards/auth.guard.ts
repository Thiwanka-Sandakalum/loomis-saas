import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map } from 'rxjs/operators';

export const authGuard = () => {
    const auth0 = inject(AuthService);
    const router = inject(Router);

    return auth0.isAuthenticated$.pipe(
        map(isAuthenticated => {
            if (isAuthenticated) {
                return true;
            } else {
                router.navigate(['/login']);
                return false;
            }
        })
    );
};