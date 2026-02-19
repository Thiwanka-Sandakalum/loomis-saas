import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

@Component({
    selector: 'app-status-badge',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <span [class]="badgeClasses()">
      @if (showDot()) {
        <span [class]="dotClasses()"></span>
      }
      {{ label() }}
    </span>
  `
})
export class StatusBadgeComponent {
    label = input.required<string>();
    variant = input<BadgeVariant>('default');
    showDot = input(true);
    size = input<'sm' | 'md'>('md');

    badgeClasses = computed(() => {
        const base = 'inline-flex items-center gap-1.5 font-medium rounded-full';

        const variants = {
            success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        };

        const sizes = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-2.5 py-1 text-sm'
        };

        return `${base} ${variants[this.variant()]} ${sizes[this.size()]}`;
    });

    dotClasses = computed(() => {
        const base = 'h-1.5 w-1.5 rounded-full';

        const colors = {
            success: 'bg-green-600 dark:bg-green-400',
            warning: 'bg-yellow-600 dark:bg-yellow-400',
            error: 'bg-red-600 dark:bg-red-400',
            info: 'bg-blue-600 dark:bg-blue-400',
            default: 'bg-slate-600 dark:bg-slate-400'
        };

        return `${base} ${colors[this.variant()]}`;
    });
}
