import { Component, input } from '@angular/core';

@Component({
    selector: 'app-empty-state',
    imports: [],
    template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      @if (icon()) {
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <span class="material-symbols-outlined text-3xl text-slate-400">{{ icon() }}</span>
        </div>
      }
      <h3 class="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{{ title() }}</h3>
      @if (description()) {
        <p class="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ description() }}</p>
      }
      <ng-content></ng-content>
    </div>
  `
})
export class EmptyStateComponent {
    icon = input<string>('inbox');
    title = input.required<string>();
    description = input<string>();
}
