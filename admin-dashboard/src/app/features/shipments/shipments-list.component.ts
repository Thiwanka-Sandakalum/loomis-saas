import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShipmentService } from '../../core/services';
import { Shipment, ShipmentStatus } from '../../core/models';
import { StatusBadgeComponent, LoadingSpinnerComponent, EmptyStateComponent } from '../../shared/components';
import { TrackingNumberPipe } from '../../shared/pipes';

@Component({
  selector: 'app-shipments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, LoadingSpinnerComponent, EmptyStateComponent, TrackingNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-7xl flex flex-col gap-6">
      <!-- Header -->
      <div class="flex justify-between items-end flex-wrap gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Shipment Management</h1>
          <p class="text-slate-500 dark:text-slate-400">Track and manage all shipments in real-time</p>
        </div>
        <div class="flex gap-2">
          <button 
            (click)="exportData()"
            class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span class="material-symbols-outlined text-[20px]">file_download</span>
            Export
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <!-- Search -->
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event); onSearchChange()"
              placeholder="Search by tracking number, customer..."
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <!-- Status Filter -->
        <select
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event); onFilterChange()"
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <!-- Service Type Filter -->
        <select
          [ngModel]="serviceTypeFilter()"
          (ngModelChange)="serviceTypeFilter.set($event); onFilterChange()"
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
          <option value="">All Services</option>
          <option value="standard">Standard</option>
          <option value="express">Express</option>
          <option value="overnight">Overnight</option>
        </select>

        <!-- Date Range -->
        <input
          type="date"
          [ngModel]="startDate()"
          (ngModelChange)="startDate.set($event); onFilterChange()"
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <input
          type="date"
          [ngModel]="endDate()"
          (ngModelChange)="endDate.set($event); onFilterChange()"
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />

        <!-- Clear Filters -->
        @if (hasActiveFilters()) {
          <button
            (click)="clearFilters()"
            class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            Clear filters
          </button>
        }
      </div>

      <!-- Results Info -->
      <div class="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>Showing {{ filteredShipments().length }} of {{ totalShipments() }} shipments</span>
        @if (selectedShipments().length > 0) {
          <div class="flex items-center gap-3">
            <span>{{ selectedShipments().length }} selected</span>
            <button
              (click)="bulkUpdateStatus('in-transit')"
              class="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-sm font-medium">
              Mark In Transit
            </button>
            <button
              (click)="bulkUpdateStatus('delivered')"
              class="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 text-sm font-medium">
              Mark Delivered
            </button>
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <app-loading-spinner size="lg"></app-loading-spinner>
        </div>
      } @else if (filteredShipments().length === 0) {
        <app-empty-state
          icon="package_2"
          title="No shipments found"
          description="Try adjusting your filters."
        ></app-empty-state>
      } @else {
        <!-- Shipments Table -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      [checked]="allSelected()"
                      (change)="toggleSelectAll()"
                      class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Route
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                @for (shipment of filteredShipments(); track shipment.id) {
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-4">
                      <input
                        type="checkbox"
                        [checked]="isSelected(shipment.id)"
                        (change)="toggleSelect(shipment.id)"
                        class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td class="px-4 py-4">
                      <a
                        [routerLink]="['/shipments', shipment.id]"
                        class="font-mono text-sm font-medium text-primary hover:text-primary/80">
                        {{ shipment.trackingNumber | trackingNumber }}
                      </a>
                    </td>
                    <td class="px-4 py-4">
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-slate-900 dark:text-white">{{ shipment.customerName }}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">{{ shipment.customerPhone }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span>{{ shipment.origin.city }}</span>
                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                        <span>{{ shipment.destination.city }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {{ shipment.serviceType }}
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      <app-status-badge 
                        [label]="formatStatus(shipment.status)"
                        [variant]="getStatusVariant(shipment.status)">
                      </app-status-badge>
                    </td>
                    <td class="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {{ formatDate(shipment.createdAt) }}
                    </td>
                    <td class="px-4 py-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          [routerLink]="['/shipments', shipment.id]"
                          class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="View Details">
                          <span class="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button
                          (click)="printLabel(shipment.id)"
                          class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="Print Label">
                          <span class="material-symbols-outlined text-[20px]">print</span>
                        </button>
                        <button
                          (click)="deleteShipment(shipment.id)"
                          class="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete">
                          <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <div class="text-sm text-slate-600 dark:text-slate-400">
              Page {{ currentPage() }} of {{ totalPages() }}
            </div>
            <div class="flex gap-2">
              <button
                (click)="previousPage()"
                [disabled]="currentPage() === 1"
                class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <button
                (click)="nextPage()"
                [disabled]="currentPage() >= totalPages()"
                class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export default class ShipmentsListComponent implements OnInit {
  private shipmentService = inject(ShipmentService);

  // State
  isLoading = signal(false);
  shipments = signal<Shipment[]>([]);
  selectedShipments = signal<string[]>([]);

  // Filters
  searchQuery = signal('');
  statusFilter = signal('');
  serviceTypeFilter = signal('');
  startDate = signal('');
  endDate = signal('');

  // Pagination
  currentPage = signal(1);
  pageSize = 20;

  // Computed
  filteredShipments = computed(() => {
    let filtered = this.shipments();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const service = this.serviceTypeFilter();
    const start = this.startDate();
    const end = this.endDate();

    if (query) {
      filtered = filtered.filter(s =>
        s.trackingNumber.toLowerCase().includes(query) ||
        s.customerName.toLowerCase().includes(query) ||
        s.origin.city.toLowerCase().includes(query) ||
        s.destination.city.toLowerCase().includes(query)
      );
    }

    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }

    if (service) {
      filtered = filtered.filter(s => s.serviceType === service);
    }

    if (start) {
      filtered = filtered.filter(s => new Date(s.createdAt) >= new Date(start));
    }

    if (end) {
      filtered = filtered.filter(s => new Date(s.createdAt) <= new Date(end));
    }

    // Apply pagination
    const page = this.currentPage();
    const startIndex = (page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return filtered.slice(startIndex, endIndex);
  });

  totalShipments = computed(() => this.shipments().length);
  totalPages = computed(() => Math.ceil(this.shipments().length / this.pageSize));
  allSelected = computed(() => {
    const visible = this.filteredShipments();
    return visible.length > 0 && visible.every(s => this.selectedShipments().includes(s.id));
  });

  ngOnInit(): void {
    this.loadShipments();
  }

  loadShipments(): void {
    this.isLoading.set(true);
    this.shipmentService.getShipments({}).subscribe({
      next: (response) => {
        this.shipments.set(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load shipments:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery() || this.statusFilter() || this.serviceTypeFilter() || this.startDate() || this.endDate());
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.serviceTypeFilter.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
  }

  toggleSelect(id: string): void {
    const selected = this.selectedShipments();
    if (selected.includes(id)) {
      this.selectedShipments.set(selected.filter(s => s !== id));
    } else {
      this.selectedShipments.set([...selected, id]);
    }
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedShipments.set([]);
    } else {
      this.selectedShipments.set(this.filteredShipments().map(s => s.id));
    }
  }

  isSelected(id: string): boolean {
    return this.selectedShipments().includes(id);
  }

  bulkUpdateStatus(status: ShipmentStatus): void {
    const ids = this.selectedShipments();
    if (ids.length === 0) return;

    this.shipmentService.bulkUpdateStatus(ids, status).subscribe({
      next: () => {
        this.loadShipments();
        this.selectedShipments.set([]);
      },
      error: (error) => {
        console.error('Failed to update shipments:', error);
      }
    });
  }

  exportData(): void {
    // TODO: Implement export functionality
    console.log('Exporting shipments...');
  }

  printLabel(id: string): void {
    // TODO: Implement print label functionality
    console.log('Printing label for:', id);
  }

  deleteShipment(id: string): void {
    if (confirm('Are you sure you want to delete this shipment?')) {
      // TODO: Implement delete functionality
      console.log('Deleting shipment:', id);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  getStatusVariant(status: ShipmentStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
    const map: Record<ShipmentStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'pending': 'info',
      'picked-up': 'info',
      'in-transit': 'success',
      'out-for-delivery': 'warning',
      'delivered': 'success',
      'delayed': 'error',
      'cancelled': 'error'
    };
    return map[status] || 'default';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
