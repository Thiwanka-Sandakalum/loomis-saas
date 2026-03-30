import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, retry, timer } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        retry({
            count: 2,
            delay: (error: HttpErrorResponse, retryCount: number) => {
                // Only retry server errors and network failures
                if (error.status >= 500 || error.status === 0) {
                    return timer(retryCount * 1000);
                }
                // Don't retry client errors (4xx)
                throw error;
            },
        }),
        catchError((error: HttpErrorResponse) => {
            // Silently swallow 400s from ADK session creation — the service handles them
            if (error.status === 400 && req.url.includes('/sessions/')) {
                return throwError(() => error);
            }

            let errorMessage = 'An error occurred';

            if (error.error instanceof ErrorEvent) {
                errorMessage = `Error: ${error.error.message}`;
            } else {
                switch (error.status) {
                    case 0:
                        errorMessage = 'Network error. Please check your connection.';
                        break;
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

            return throwError(() => new Error(errorMessage));
        })
    );
};
