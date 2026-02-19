import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ErrorHandlerService } from '../services/error-handler.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private injector: Injector) { }

    handleError(error: Error): void {
        const errorService = this.injector.get(ErrorHandlerService);

        // Log the error
        console.error('Global error caught:', error);

        // Handle the error through our service
        errorService.handleError(error).subscribe({
            error: (transformedError) => {
                // Error has been logged and transformed
                // Could show a global error toast/notification here
                this.showErrorNotification(transformedError.message);
            }
        });
    }

    private showErrorNotification(message: string): void {
        // TODO: Integrate with a toast/notification service
        // For now, use browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Error', { body: message });
        }
    }
}
