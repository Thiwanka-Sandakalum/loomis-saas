import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'trackingNumber'
})
export class TrackingNumberPipe implements PipeTransform {
    transform(value: string): string {
        if (!value) return '';

        // Format: LMS-ABC123 -> LMS-ABC-123
        if (value.startsWith('LMS-') && value.length > 7) {
            return value.slice(0, 7) + '-' + value.slice(7);
        }

        return value;
    }
}
