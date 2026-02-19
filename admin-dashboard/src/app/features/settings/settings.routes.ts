import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./settings.component').then((m) => m.default),
    },
] as Routes;
