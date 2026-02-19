import { Component, input } from '@angular/core';

@Component({
    selector: 'app-loading-spinner',
    imports: [],
    template: `
    <div [class]="containerClasses()">
      <div [class]="spinnerClasses()"></div>
      @if (text()) {
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ text() }}</p>
      }
    </div>
  `
})
export class LoadingSpinnerComponent {
    text = input<string>();
    size = input<'sm' | 'md' | 'lg'>('md');
    center = input(true);

    containerClasses = () => {
        const base = 'flex flex-col items-center justify-center';
        const centered = this.center() ? 'min-h-[200px]' : '';
        return `${base} ${centered}`;
    };

    spinnerClasses = () => {
        const base = 'animate-spin rounded-full border-2 border-primary border-t-transparent';

        const sizes = {
            sm: 'h-6 w-6',
            md: 'h-10 w-10',
            lg: 'h-16 w-16'
        };

        return `${base} ${sizes[this.size()]}`;
    };
}
