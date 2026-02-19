import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShipmentService } from '../../core/services';
import { Shipment } from '../../core/models';
import { LoadingSpinnerComponent, StatusBadgeComponent } from '../../shared/components';
import { TrackingNumberPipe } from '../../shared/pipes';

@Component({
  selector: 'app-shipment-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent, StatusBadgeComponent, TrackingNumberPipe],
  template: `
    <div class="mx-auto w-full max-w-5xl">
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <app-loading-spinner size="lg"></app-loading-spinner>
        </div>
      } @else if (shipment()) {
        <div class="flex flex-col gap-6">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button
                [routerLink]="['/shipments']"
                class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                  {{ shipment()!.trackingNumber | trackingNumber }}
                </h1>
                <p class="text-slate-500 dark:text-slate-400">Shipment Details</p>
              </div>
            </div>
            <app-status-badge 
              [label]="shipment()?.statusLabel || shipment()?.status || 'Unknown'"
              [variant]="getStatusVariant(shipment()?.statusLabel || shipment()?.status)">
            </app-status-badge>
          </div>

          <!-- Summary -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p class="text-xs text-slate-500 dark:text-slate-400">Created</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(shipment()!.createdAt) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p class="text-xs text-slate-500 dark:text-slate-400">Estimated Delivery</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(shipment()!.eta) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p class="text-xs text-slate-500 dark:text-slate-400">Service Type</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ shipment()!.serviceType }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p class="text-xs text-slate-500 dark:text-slate-400">Status</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ shipment()!.statusLabel || shipment()!.status }}</p>
            </div>
          </div>

          <!-- Content -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Sender Info -->
            <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Sender</h3>
              <div class="space-y-2">
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ shipment()!.senderName || 'Unknown Sender' }}</p>
                <p class="text-sm text-slate-700 dark:text-slate-300">{{ shipment()!.origin.street }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ shipment()!.origin.city }}, {{ shipment()!.origin.country }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ shipment()!.senderPhone || 'N/A' }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ shipment()!.senderEmail || 'N/A' }}</p>
              </div>
            </div>

            <!-- Receiver Info -->
            <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Receiver</h3>
              <div class="space-y-2">
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ shipment()!.receiverName || shipment()!.customerName }}</p>
                <p class="text-sm text-slate-700 dark:text-slate-300">{{ shipment()!.destination.street }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ shipment()!.destination.city }}, {{ shipment()!.destination.country }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ shipment()!.receiverPhone || shipment()!.customerPhone }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ shipment()!.receiverEmail || 'N/A' }}</p>
              </div>
            </div>
          </div>

          <!-- Package Details -->
          <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Package Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">Weight</p>
                <p class="text-slate-900 dark:text-white font-medium">{{ shipment()!.weight }} kg</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">Service Type</p>
                <p class="text-slate-900 dark:text-white font-medium capitalize">{{ shipment()!.serviceType }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">Amount</p>
                <p class="text-slate-900 dark:text-white font-medium">{{ shipment()!.parcelValue ?? shipment()!.cost | currency:'USD':'symbol' }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">Description</p>
                <p class="text-slate-900 dark:text-white font-medium">{{ shipment()!.parcelDescription || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-400">Dimensions (L×W×H)</p>
                <p class="text-slate-900 dark:text-white font-medium">
                  {{ shipment()!.parcelLength ?? 'N/A' }} × {{ shipment()!.parcelWidth ?? 'N/A' }} × {{ shipment()!.parcelHeight ?? 'N/A' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export default class ShipmentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shipmentService = inject(ShipmentService);

  shipment = signal<Shipment | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadShipment(id);
    }
  }

  loadShipment(id: string): void {
    this.shipmentService.getShipmentById(id).subscribe({
      next: (shipment) => {
        this.shipment.set(shipment);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load shipment:', error);
        this.isLoading.set(false);
      }
    });
  }

  getStatusVariant(status?: string | null): 'success' | 'warning' | 'error' | 'info' | 'default' {
    const lowerStatus = (status ?? '').toLowerCase();

    if (lowerStatus.includes('delivered') || lowerStatus.includes('completed')) {
      return 'success';
    }
    if (lowerStatus.includes('transit') || lowerStatus.includes('shipping') || lowerStatus.includes('progress')) {
      return 'info';
    }
    if (lowerStatus.includes('delayed') || lowerStatus.includes('issue') || lowerStatus.includes('problem')) {
      return 'error';
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('awaiting') || lowerStatus.includes('created')) {
      return 'warning';
    }

    return 'default';
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
}
