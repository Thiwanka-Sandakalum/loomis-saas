import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="relative flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark">
      <app-sidebar />
      <div class="flex-1 ml-72 flex flex-col h-screen overflow-hidden">
        <main class="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class LayoutComponent { }
