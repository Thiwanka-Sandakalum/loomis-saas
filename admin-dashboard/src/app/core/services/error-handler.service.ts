import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export interface AppError {
    message: string;
    code?: string;
    statusCode?: number;
    details?: any;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {
    handleError(error: HttpErrorResponse | Error): Observable<never> {
        const appError = this.transformError(error);

        // Log to console in development
        if (!this.isProduction()) {
            console.error('Application Error:', appError);
        }

        // TODO: Send to logging service (e.g., Sentry, LogRocket)
        this.logToService(appError);

        return throwError(() => appError);
    }

    private transformError(error: HttpErrorResponse | Error): AppError {
        if (error instanceof HttpErrorResponse) {
            return this.handleHttpError(error);
        }

        return {
            message: error.message || 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR',
            timestamp: new Date(),
        };
    }

    private handleHttpError(error: HttpErrorResponse): AppError {
        const baseError: AppError = {
            message: 'An error occurred',
            statusCode: error.status,
            timestamp: new Date(),
        };

        switch (error.status) {
            case 0:
                return {
                    ...baseError,
                    code: 'NETWORK_ERROR',
                    message: 'Unable to connect to server. Please check your internet connection.',
                };

            case 400:
                return {
                    ...baseError,
                    code: 'BAD_REQUEST',
                    message: error.error?.message || 'Invalid request. Please check your input.',
                    details: error.error,
                };

            case 401:
                return {
                    ...baseError,
                    code: 'UNAUTHORIZED',
                    message: 'Your session has expired. Please log in again.',
                };

            case 403:
                return {
                    ...baseError,
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to perform this action.',
                };

            case 404:
                return {
                    ...baseError,
                    code: 'NOT_FOUND',
                    message: error.error?.message || 'The requested resource was not found.',
                };

            case 409:
                return {
                    ...baseError,
                    code: 'CONFLICT',
                    message: error.error?.message || 'This operation conflicts with existing data.',
                };

            case 422:
                return {
                    ...baseError,
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed. Please check your input.',
                    details: error.error,
                };

            case 429:
                return {
                    ...baseError,
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Please try again later.',
                    details: { retryAfter: error.headers.get('Retry-After') },
                };

            case 500:
                return {
                    ...baseError,
                    code: 'SERVER_ERROR',
                    message: 'An internal server error occurred. Please try again later.',
                };

            case 503:
                return {
                    ...baseError,
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Service temporarily unavailable. Please try again later.',
                };

            default:
                return {
                    ...baseError,
                    code: 'HTTP_ERROR',
                    message: error.error?.message || `An error occurred (${error.status})`,
                    details: error.error,
                };
        }
    }

    private logToService(error: AppError): void {
        // TODO: Integrate with external logging service
        // Example: Sentry.captureException(error);

        // For now, log to localStorage for debugging
        try {
            const errors = this.getStoredErrors();
            errors.push(error);

            // Keep only last 50 errors
            const recentErrors = errors.slice(-50);
            localStorage.setItem('app_errors', JSON.stringify(recentErrors));
        } catch (e) {
            // Fail silently if localStorage is full
            console.warn('Failed to store error in localStorage:', e);
        }
    }

    private getStoredErrors(): AppError[] {
        try {
            const stored = localStorage.getItem('app_errors');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    private isProduction(): boolean {
        return false; // TODO: Set based on environment
    }

    getUserFriendlyMessage(error: AppError): string {
        return error.message;
    }

    clearStoredErrors(): void {
        localStorage.removeItem('app_errors');
    }

    getErrorHistory(): AppError[] {
        return this.getStoredErrors();
    }
}
