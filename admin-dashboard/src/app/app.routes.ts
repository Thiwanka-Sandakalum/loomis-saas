

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component')
    },
    {
        path: '',
        canActivate: [authGuard],
        component: LayoutComponent,
        children: [
            { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component') },
            {
                path: 'inquiries',
                children: [
                    { path: '', loadComponent: () => import('./features/inquiries/inquiries.component') },
                    { path: ':id', loadComponent: () => import('./features/inquiries/inquiry-detail.component') }
                ]
            },
            { path: 'shipments', loadChildren: () => import('./features/shipments/shipments.routes') },
            { path: 'rates', loadChildren: () => import('./features/rates/rates.routes') },
            { path: 'settings', loadComponent: () => import('./features/settings/settings.component') },
            { path: 'settings-hub', loadComponent: () => import('./features/settings/settings-hub.component').then(m => m.SettingsHubComponent) },
            { path: 'integrations', loadComponent: () => import('./features/integrations/integrations.component') },
            { path: 'ai-agent', loadComponent: () => import('./features/ai-agent/ai-agent-sandbox.component') },
        ]
    },
    {
        path: 'onboarding',
        loadChildren: () => import('./features/onboarding/onboarding.routes'),
    }
];
