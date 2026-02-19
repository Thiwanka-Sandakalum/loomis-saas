import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeAgo'
})
export class TimeAgoPipe implements PipeTransform {
    transform(value: Date | string): string {
        if (!value) return '';

        const date = typeof value === 'string' ? new Date(value) : value;
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }
}
