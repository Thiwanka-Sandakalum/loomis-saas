import { Component } from '@angular/core';
import { LoadingSpinnerComponent } from './loading-spinner.component';

@Component({
    selector: 'app-preloader',
    standalone: true,
    imports: [LoadingSpinnerComponent],
    template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div class="flex flex-col items-center gap-6">
        <div class="flex items-center gap-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <span class="material-symbols-outlined text-3xl text-primary">local_shipping</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Loomis Courier</h1>
            <p class="text-primary/80 text-sm font-medium">Admin Platform</p>
          </div>
        </div>
        <app-loading-spinner text="Loading your workspace..." size="lg" [center]="true" />
      </div>
    </div>
  `
})
export class AppPreloaderComponent { }
