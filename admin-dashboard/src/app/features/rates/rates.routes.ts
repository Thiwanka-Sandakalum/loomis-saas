import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./rates.component').then((m) => m.RatesComponent),
    },
] as Routes;
