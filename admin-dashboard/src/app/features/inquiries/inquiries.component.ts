import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InquiryService } from '../../core/services';
import { Inquiry } from '../../core/models';
import { LoadingSpinnerComponent, EmptyStateComponent } from '../../shared/components';
import { TimeAgoPipe } from '../../shared/pipes';

@Component({
  selector: 'app-inquiries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingSpinnerComponent, EmptyStateComponent, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-7xl flex flex-col gap-6 pb-24">
      
      <!-- Header -->
      <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <span class="material-symbols-outlined text-3xl text-slate-400">chat</span>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Customer Inquiries</h1>
      </div>

      <!-- Filters & Actions Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        <!-- Tabs Group -->
        <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <div class="relative">
            <select 
              [ngModel]="statusFilter()" 
              (ngModelChange)="onStatusChange($event)"
              class="appearance-none bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">arrow_drop_down</span>
          </div>

          <div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button
            (click)="setChannelFilter('whatsapp')"
            [class.bg-green-100]="channelFilter() === 'whatsapp'"
            [class.text-green-700]="channelFilter() === 'whatsapp'"
            [class.dark:bg-green-900/30]="channelFilter() === 'whatsapp'"
            [class.dark:text-green-400]="channelFilter() === 'whatsapp'"
            [class.bg-slate-50]="channelFilter() !== 'whatsapp'"
            [class.text-slate-600]="channelFilter() !== 'whatsapp'"
            [class.dark:bg-slate-800]="channelFilter() !== 'whatsapp'"
            [class.dark:text-slate-400]="channelFilter() !== 'whatsapp'"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="material-symbols-outlined text-[18px]" [class.filled]="channelFilter() === 'whatsapp'">chat</span>
            WhatsApp
          </button>

          <button
            (click)="setChannelFilter('telegram')"
            [class.bg-blue-100]="channelFilter() === 'telegram'"
            [class.text-blue-700]="channelFilter() === 'telegram'"
            [class.dark:bg-blue-900/30]="channelFilter() === 'telegram'"
            [class.dark:text-blue-400]="channelFilter() === 'telegram'"
            [class.bg-slate-50]="channelFilter() !== 'telegram'"
            [class.text-slate-600]="channelFilter() !== 'telegram'"
            [class.dark:bg-slate-800]="channelFilter() !== 'telegram'"
            [class.dark:text-slate-400]="channelFilter() !== 'telegram'"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="material-symbols-outlined text-[18px]" [class.filled]="channelFilter() === 'telegram'">send</span>
            Telegram
          </button>

          <button
            (click)="setChannelFilter('api')"
            [class.bg-purple-100]="channelFilter() === 'api'"
            [class.text-purple-700]="channelFilter() === 'api'"
            [class.dark:bg-purple-900/30]="channelFilter() === 'api'"
            [class.dark:text-purple-400]="channelFilter() === 'api'"
            [class.bg-slate-50]="channelFilter() !== 'api'"
            [class.text-slate-600]="channelFilter() !== 'api'"
            [class.dark:bg-slate-800]="channelFilter() !== 'api'"
            [class.dark:text-slate-400]="channelFilter() !== 'api'"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="material-symbols-outlined text-[18px]" [class.filled]="channelFilter() === 'api'">code</span>
            API
          </button>
        </div>

        <!-- Search & Filter Actions -->
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <div class="relative flex-1 sm:w-64">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search..."
              class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white placeholder-slate-400 transition-all"
            />
          </div>
          <button class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap">
            <span class="material-symbols-outlined text-[20px]">filter_list</span>
            Filter
          </button>
        </div>
      </div>

      <!-- Data Table -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <app-loading-spinner size="lg"></app-loading-spinner>
        </div>
      } @else if (filteredInquiries().length === 0) {
        <app-empty-state
          icon="chat"
          title="No inquiries found"
          description="Try adjusting your filters or check back later"
        ></app-empty-state>
      } @else {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                  <th class="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[140px]">Status</th>
                  <th class="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[200px]">Customer</th>
                  <th class="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Message Preview</th>
                  <th class="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[120px]">Channel</th>
                  <th class="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[100px]">Time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (inquiry of filteredInquiries(); track inquiry.id) {
                  <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    
                    <!-- Status -->
                    <td class="py-4 px-6 align-top">
                      <div class="flex items-center gap-2">
                        @switch (inquiry.status) {
                          @case ('open') { <div class="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div> }
                          @case ('pending') { <div class="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div> }
                          @case ('resolved') { <div class="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div> }
                          @case ('closed') { <div class="h-2.5 w-2.5 rounded-full bg-slate-500"></div> }
                        }
                        <span class="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
                          {{ inquiry.status }}
                        </span>
                      </div>
                    </td>

                    <!-- Customer -->
                    <td class="py-4 px-6 align-top">
                      <div class="flex flex-col">
                        <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ inquiry.customerName }}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{{ inquiry.customerPhone || 'N/A' }}</span>
                      </div>
                    </td>

                    <!-- Message Preview -->
                    <td class="py-4 px-6 align-top">
                      <div class="flex flex-col gap-2">
                        <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                          "{{ inquiry.messagePreview }}"
                        </p>
                        <div class="flex items-center gap-3">
                          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {{ inquiry.id.substring(0, 8) }}
                          </span>
                          
                          <!-- Inline Actions -->
                          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a [routerLink]="['/inquiries', inquiry.id]" class="text-xs font-medium text-primary hover:text-primary-600 hover:underline cursor-pointer">
                              [View Conversation]
                            </a>
                            @if (inquiry.status === 'open') {
                              <button (click)="assignInquiry(inquiry.id)" class="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline">
                                [Assign to CSR]
                              </button>
                            } @else if (inquiry.status === 'pending') {
                              <button (click)="escalateInquiry(inquiry.id)" class="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline">
                                [Escalate]
                              </button>
                            } @else {
                              <a [routerLink]="['/inquiries', inquiry.id]" class="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer">
                                [View Details]
                              </a>
                            }
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Channel -->
                    <td class="py-4 px-6 align-top">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {{ inquiry.channel }}
                        </span>
                      </div>
                    </td>

                    <!-- Time -->
                    <td class="py-4 px-6 align-top text-right">
                      <span class="text-xs font-medium text-slate-400 whitespace-nowrap">
                        {{ inquiry.createdAt | timeAgo }}
                      </span>
                    </td>

                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-3">
            <div class="flex items-center gap-2">
              <button
                (click)="previousPage()"
                [disabled]="page() <= 1"
                class="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                <span class="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
                Page {{ page() }} of {{ totalPages() }}
              </span>
              <button
                (click)="nextPage()"
                [disabled]="page() >= totalPages()"
                class="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                <span class="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Showing <span class="font-medium text-slate-900 dark:text-white">{{ rangeStart() }}-{{ rangeEnd() }}</span>
              of <span class="font-medium text-slate-900 dark:text-white">{{ totalItems() }}</span>
            </p>
          </div>
        </div>
      }



    </div>
  `,
})
export default class InquiriesComponent implements OnInit {
  private inquiryService = inject(InquiryService);

  // State
  inquiries = signal<Inquiry[]>([]);

  isLoading = signal(false);
  totalItems = signal(0);
  page = signal(1);
  pageSize = signal(20);
  channelFilter = signal<string>('');
  statusFilter = signal<string>('');
  searchQuery = signal<string>('');

  // Derived state
  filteredInquiries = computed(() => {
    const channel = this.channelFilter();
    const status = this.statusFilter();
    const query = this.searchQuery().toLowerCase();

    return this.inquiries().filter(inquiry => {
      const matchesChannel = !channel || inquiry.channel === channel;
      const matchesStatus = !status || inquiry.status === status;
      const matchesSearch = !query ||
        inquiry.customerName.toLowerCase().includes(query) ||
        inquiry.id.toLowerCase().includes(query) ||
        inquiry.messagePreview.toLowerCase().includes(query);

      return matchesChannel && matchesStatus && matchesSearch;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  rangeStart = computed(() => (this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));

  ngOnInit(): void {
    this.loadInquiries();
  }

  loadInquiries(): void {
    this.isLoading.set(true);
    this.inquiryService.getInquiries({
      page: this.page(),
      pageSize: this.pageSize(),
      channel: this.channelFilter() ? (this.channelFilter() as Inquiry['channel']) : 'all',
      status: this.statusFilter() ? (this.statusFilter() as Inquiry['status']) : 'all',
      searchQuery: this.searchQuery()
    }).subscribe({
      next: (response) => {
        this.inquiries.set(response.data);
        this.totalItems.set(response.pagination.totalItems);
        this.page.set(response.pagination.page);
        this.pageSize.set(response.pagination.pageSize);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load inquiries:', error);
        this.isLoading.set(false);
      }
    });
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadInquiries();
  }

  setChannelFilter(channel: string): void {
    if (this.channelFilter() === channel) {
      this.channelFilter.set(''); // Toggle off
    } else {
      this.channelFilter.set(channel);
    }
    this.page.set(1);
    this.loadInquiries();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.loadInquiries();
  }

  nextPage(): void {
    this.goToPage(this.page() + 1);
  }

  previousPage(): void {
    this.goToPage(this.page() - 1);
  }

  assignInquiry(id: string): void {
    console.log('Assigning inquiry:', id);
    // Logic to open modal or call service
  }

  escalateInquiry(id: string): void {
    console.log('Escalating inquiry:', id);
    // Logic to escalate
  }

  exportData(): void {
    console.log('Exporting data...');
  }
}
