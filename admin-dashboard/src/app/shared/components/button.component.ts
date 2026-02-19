import { Component, input, output } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
    selector: 'app-button',
    imports: [],
    template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="buttonClasses()"
      (click)="!disabled() && !loading() && onClick.emit($event)"
    >
      @if (loading()) {
        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      }
      <ng-content></ng-content>
    </button>
  `,
    host: {
        class: 'inline-block'
    }
})
export class ButtonComponent {
    variant = input<ButtonVariant>('primary');
    size = input<ButtonSize>('md');
    type = input<'button' | 'submit'>('button');
    disabled = input(false);
    loading = input(false);
    fullWidth = input(false);

    onClick = output<Event>();

    buttonClasses = () => {
        const base = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary shadow-sm shadow-primary/20',
            secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-sm',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm shadow-red-600/20',
            ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-800'
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm rounded-md',
            md: 'px-4 py-2 text-sm rounded-lg',
            lg: 'px-6 py-3 text-base rounded-lg'
        };

        const width = this.fullWidth() ? 'w-full' : '';

        return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${width}`;
    };
}
