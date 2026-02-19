import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./shipments.component')
    },
    {
        path: 'create',
        loadComponent: () => import('./shipment-create.component').then(m => m.ShipmentCreateComponent)
    },
    {
        path: ':trackingNumber',
        loadComponent: () => import('./shipment-detail.component')
    }
] as Routes;
