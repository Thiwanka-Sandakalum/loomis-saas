import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Silently swallow 400s from ADK session creation — the service handles them
            if (error.status === 400 && req.url.includes('/sessions/')) {
                return throwError(() => error);
            }

            let errorMessage = 'An error occurred';

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = `Error: ${error.error.message}`;
            } else {
                // Server-side error
                switch (error.status) {
                    case 401:
                        errorMessage = 'Unauthorized. Please log in again.';
                        router.navigate(['/login']);
                        break;
                    case 403:
                        errorMessage = 'Access forbidden.';
                        break;
                    case 404:
                        errorMessage = 'Resource not found.';
                        break;
                    case 500:
                        errorMessage = 'Internal server error. Please try again later.';
                        break;
                    default:
                        errorMessage = error.error?.message || `Error: ${error.statusText}`;
                }
            }

            console.error('HTTP Error:', errorMessage, error);

            // You can integrate with a toast notification service here
            // toastService.error(errorMessage);

            return throwError(() => new Error(errorMessage));
        })
    );
};
