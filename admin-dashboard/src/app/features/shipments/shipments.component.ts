import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShipmentsService } from '../../core/api-client/api/shipments.service';
import { ShipmentResponse } from '../../core/api-client/model/shipmentResponse';
import { ShipmentResponsePagedResponse } from '../../core/api-client/model/shipmentResponsePagedResponse';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

interface ShipmentViewModel {
  id: string;
  trackingNumber: string;
  customerName: string;
  customerEmail: string;
  origin: string;
  destination: string;
  status: string;
  serviceType: string;
  estimatedDelivery: string;
  createdAt: string;
}

@Component({
  selector: 'app-shipments',
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <!-- Header -->
      <div class="flex justify-between items-end flex-wrap gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Shipment Management</h1>
          <p class="text-slate-500 dark:text-slate-400">Track and manage all shipments in real-time.</p>
        </div>
        <div class="flex gap-2">
          <button 
            (click)="refreshShipments()"
            [disabled]="isLoading()"
            class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <span class="material-symbols-outlined text-[20px]" [class.animate-spin]="isLoading()">refresh</span>
            Refresh
          </button>
          <button class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span class="material-symbols-outlined text-[20px]">filter_alt</span>
            Filter
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading() && shipments().length === 0) {
        <div class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-12">
          <div class="flex flex-col items-center justify-center gap-4">
            <app-loading-spinner />
            <p class="text-slate-500 dark:text-slate-400">Loading shipments...</p>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-6">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-red-500 text-xl">error</span>
            <div>
              <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Failed to load shipments</h3>
              <p class="text-sm text-red-700 dark:text-red-300">{{ error() }}</p>
              <button 
                (click)="refreshShipments()"
                class="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-md text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && !error() && shipments().length === 0) {
        <div class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-12">
          <div class="text-center">
            <span class="material-symbols-outlined text-4xl text-slate-400 mb-4 block">package_2</span>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">No shipments found</h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6">Get started by creating your first shipment.</p>
          </div>
        </div>
      }

      <!-- Table -->
      @if (!isLoading() && !error() && shipments().length > 0) {
        <div class="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <!-- Stats Header -->
          <div class="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-6">
                <div class="text-sm">
                  <span class="font-medium text-slate-900 dark:text-white">{{ totalShipments() }}</span>
                  <span class="text-slate-500 dark:text-slate-400 ml-1">total shipments</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium text-slate-900 dark:text-white">{{ currentPage() }}</span>
                  <span class="text-slate-500 dark:text-slate-400 ml-1">of {{ totalPages() }} pages</span>
                </div>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                Last updated: {{ lastUpdated() }}
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tracking #</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Customer</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Route</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Service</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">ETA</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              @for (shipment of shipments(); track shipment.id) {
                <tr class="group hover:bg-primary/5 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <td class="py-3 px-4">
                    <p class="text-sm font-mono font-medium text-slate-900 dark:text-white">{{ shipment.trackingNumber }}</p>
                  </td>
                  <td class="py-3 px-4">
                    <div>
                      <p class="text-sm font-medium text-slate-900 dark:text-white">{{ shipment.customerName }}</p>
                      @if (shipment.customerEmail) {
                        <p class="text-xs text-slate-500 dark:text-slate-400">{{ shipment.customerEmail }}</p>
                      }
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span class="truncate max-w-[100px]" [title]="shipment.origin">{{ shipment.origin }}</span>
                      <span class="material-symbols-outlined text-[16px] text-slate-400">arrow_forward</span>
                      <span class="truncate max-w-[100px]" [title]="shipment.destination">{{ shipment.destination }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {{ shipment.serviceType }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <app-status-badge [label]="shipment.status" [variant]="getStatusVariant(shipment.status)" />
                  </td>
                  <td class="py-3 px-4">
                    <p class="text-sm text-slate-600 dark:text-slate-400">{{ formatDate(shipment.estimatedDelivery) }}</p>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="flex justify-end gap-2">
                      <button 
                        [routerLink]="['/shipments', shipment.id]"
                        class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-primary transition-colors"
                        title="View Details"
                      >
                        <span class="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button 
                        (click)="trackShipment(shipment.trackingNumber)"
                        class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-primary transition-colors"
                        title="Track Shipment"
                      >
                        <span class="material-symbols-outlined text-[20px]">location_on</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          </div>
          
          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <div class="flex items-center justify-between">
                <button 
                  (click)="previousPage()"
                  [disabled]="currentPage() <= 1 || isLoading()"
                  class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                  Previous
                </button>
                
                <div class="flex items-center gap-2">
                  @for (page of visiblePages(); track page) {
                    <button 
                      (click)="goToPage(page)"
                      [disabled]="isLoading()"
                      [class.bg-primary]="page === currentPage()"
                      [class.text-white]="page === currentPage()"
                      [class.hover:bg-slate-100]="page !== currentPage()"
                      [class.dark:hover:bg-slate-700]="page !== currentPage()"
                      class="w-8 h-8 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      {{ page }}
                    </button>
                  }
                </div>
                
                <button 
                  (click)="nextPage()"
                  [disabled]="currentPage() >= totalPages() || isLoading()"
                  class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Next
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ShipmentsComponent implements OnInit {
  private readonly shipmentsService = inject(ShipmentsService);

  // State signals
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly totalShipments = signal(0);
  protected readonly lastUpdated = signal<string>('');

  private readonly rawShipments = signal<ShipmentResponse[]>([]);
  private readonly pageSize = signal(25);

  // Computed properties
  protected readonly shipments = computed(() =>
    this.rawShipments().map(this.mapToViewModel)
  );

  protected readonly totalPages = computed(() =>
    Math.ceil(this.totalShipments() / this.pageSize())
  );

  protected readonly visiblePages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];

    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  });

  ngOnInit(): void {
    this.loadShipments();
  }

  protected refreshShipments(): void {
    this.loadShipments();
  }

  protected previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadShipments();
    }
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadShipments();
    }
  }

  protected goToPage(page: number): void {
    if (page !== this.currentPage() && page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadShipments();
    }
  }

  protected trackShipment(trackingNumber: string): void {
    // TODO: Navigate to tracking page or show modal
    console.log('Track shipment:', trackingNumber);
  }

  protected getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.includes('delivered') || lowerStatus.includes('completed')) {
      return 'success';
    }
    if (lowerStatus.includes('transit') || lowerStatus.includes('shipping') || lowerStatus.includes('progress')) {
      return 'info';
    }
    if (lowerStatus.includes('delayed') || lowerStatus.includes('issue') || lowerStatus.includes('problem')) {
      return 'error';
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('awaiting')) {
      return 'warning';
    }

    return 'default';
  }

  protected formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  }

  private loadShipments(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.shipmentsService.apiShipmentsGet(
      this.currentPage(),
      this.pageSize()
    ).subscribe({
      next: (response: ShipmentResponsePagedResponse) => {
        this.rawShipments.set(response.data || []);
        this.totalShipments.set(response.pagination?.totalItems || 0);
        this.updateLastUpdated();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load shipments:', err);
        this.error.set(
          err.status === 404 ? 'No shipments found' :
            err.status >= 500 ? 'Server error. Please try again later.' :
              err.error?.message || 'Failed to load shipments'
        );
        this.isLoading.set(false);
      }
    });
  }

  private mapToViewModel = (shipment: ShipmentResponse): ShipmentViewModel => {
    const trackingNumber = shipment.trackingNumber || 'N/A';
    return {
      id: trackingNumber !== 'N/A' ? trackingNumber : shipment.id || '',
      trackingNumber,
      customerName: shipment.receiver?.name || 'Unknown Customer',
      customerEmail: shipment.receiver?.email || '',
      origin: this.formatLocation(shipment.sender),
      destination: this.formatLocation(shipment.receiver),
      status: this.formatStatus(shipment.status),
      serviceType: shipment.serviceType || 'Standard',
      estimatedDelivery: shipment.estimatedDelivery || '',
      createdAt: shipment.createdAt || ''
    };
  };

  private formatLocation(contact: any): string {
    if (!contact) return 'Unknown';

    const parts = [contact.city, contact.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : contact.address || 'Unknown';
  }

  private formatStatus(status: string | null | undefined): string {
    if (!status) return 'Unknown';

    // Convert API status to display format
    return status.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private updateLastUpdated(): void {
    const now = new Date();
    this.lastUpdated.set(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(now)
    );
  }
}

export default ShipmentsComponent;
