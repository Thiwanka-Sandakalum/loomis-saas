import { Component, input } from '@angular/core';

@Component({
    selector: 'app-card',
    imports: [],
    template: `
    <div [class]="cardClasses()">
      @if (title()) {
        <div class="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
          }
        </div>
      }
      <div [class]="padding() ? 'p-6' : ''">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {
    title = input<string>();
    subtitle = input<string>();
    padding = input(true);
    hoverable = input(false);

    cardClasses = () => {
        const base = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
        const hover = this.hoverable() ? 'transition-all hover:shadow-lg cursor-pointer' : '';
        return `${base} ${hover}`;
    };
}
