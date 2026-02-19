import { Routes } from '@angular/router';

export default [
    { path: 'company-setup', loadComponent: () => import('./steps/company-setup.component').then(m => m.CompanySetupComponent) },
    { path: 'service-rates', loadComponent: () => import('./steps/service-rates.component').then(m => m.ServiceRatesComponent) }
] as Routes;
