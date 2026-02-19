import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LineChartComponent, PieChartComponent, LoadingSpinnerComponent } from '../../shared/components';
import { useDashboardData } from './composables/use-dashboard-data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LineChartComponent, PieChartComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
      
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Feature Navigation Card -->
        <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-lg cursor-pointer group border-l-4 border-l-red-500">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-red-600 dark:text-red-400">Immediate Action</span>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
              <span class="material-symbols-outlined text-red-600 dark:text-red-400">phone_callback</span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">
              <ng-container *ngIf="urgentInquiriesCount() > 0; else allClear">
                {{ urgentInquiriesCount() }} Urgent Inquiries
              </ng-container>
              <ng-template #allClear>
                <span class="text-green-600 flex items-center gap-1"><span class="material-symbols-outlined text-green-600">check_circle</span>All caught up!</span>
              </ng-template>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              <ng-container *ngIf="urgentInquiriesCount() > 0; else noUrgentMsg">
                Customers waiting for response. View details in inquiries tab to call them directly.
              </ng-container>
              <ng-template #noUrgentMsg>
                No urgent actions required.
              </ng-template>
            </p>
          </div>
        </div>

        @for (kpi of kpiCards(); track kpi.title) {
          <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ kpi.title }}</span>
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
                <span class="material-symbols-outlined text-slate-400">{{ kpi.icon }}</span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <ng-container *ngIf="kpi.value !== '-' && kpi.value !== '0'; else emptyKpi">
                <h3 class="text-3xl font-bold text-slate-900 dark:text-white">{{ kpi.value }}</h3>
                <p class="flex items-center gap-1 text-sm"
                   [class.text-green-600]="kpi.trend === 'up'"
                   [class.text-red-600]="kpi.trend === 'down'">
                  <span class="material-symbols-outlined text-[16px]">
                    {{ kpi.trend === 'up' ? 'trending_up' : 'trending_down' }}
                  </span>
                  {{ kpi.change }}
                </p>
              </ng-container>
              <ng-template #emptyKpi>
                <h3 class="text-3xl font-bold text-slate-400 dark:text-slate-600">No data yet</h3>
                <p class="text-xs text-slate-400 dark:text-slate-500">Awaiting activity</p>
              </ng-template>
            </div>
          </div>
        }
      </div>

      <!-- Customer Support Section -->
      <section class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
            <div class="flex flex-col">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">Customer Support Overview</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Analysis of inquiries and interactions</p>
            </div>
            
            <div class="flex items-center gap-2">
                <select 
                    [(ngModel)]="inquiryPeriod"
                    (change)="onInquiryPeriodChange()"
                    class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                    <option [value]="7">Last 7 days</option>
                    <option [value]="30">Last 30 days</option>
                    <option [value]="90">Last 90 days</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Inquiry Volume Chart -->
            <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Inquiries Volume</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">Daily inquiries handled over time</p>
                
                @defer (on viewport) {
                  @if (isLoadingInquiryVolume()) {
                      <div class="flex h-64 items-center justify-center">
                          <app-loading-spinner size="md"></app-loading-spinner>
                      </div>
                  } @else {
                      <ng-container *ngIf="inquiryVolumeData().datasets.length > 0 && inquiryVolumeData().datasets[0].data.length > 0; else emptyChart">
                        <app-line-chart 
                            [data]="inquiryVolumeData()"
                            height="300px"
                        ></app-line-chart>
                      </ng-container>
                      <ng-template #emptyChart>
                        <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                          <span class="material-symbols-outlined text-5xl mb-2">insights</span>
                          <div>No inquiries yet.<br>Your activity will appear here.</div>
                        </div>
                      </ng-template>
                  }
                } @placeholder {
                  <div class="flex h-64 items-center justify-center">
                    <div class="text-slate-400">Loading chart...</div>
                  </div>
                }
            </div>

            <!-- Inquiry Breakdown Chart -->
            <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Inquiry Purpose</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">Breakdown of support request types</p>

                @defer (on viewport) {
                  @if (isLoadingInquiryPurpose()) {
                      <div class="flex h-64 items-center justify-center">
                          <app-loading-spinner size="md"></app-loading-spinner>
                      </div>
                  } @else {
                      <ng-container *ngIf="inquiryPurposeData().datasets.length > 0 && inquiryPurposeData().datasets[0].data.length > 0; else emptyPie">
                        <app-pie-chart
                            [data]="inquiryPurposeData()"
                            height="300px"
                        ></app-pie-chart>
                      </ng-container>
                      <ng-template #emptyPie>
                        <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                          <span class="material-symbols-outlined text-5xl mb-2">pie_chart</span>
                          <div>No support requests yet.<br>Breakdown will appear here.</div>
                        </div>
                      </ng-template>
                  }
                } @placeholder {
                  <div class="flex h-64 items-center justify-center">
                    <div class="text-slate-400">Loading chart...</div>
                  </div>
                }
            </div>
        </div>
      </section>

      <!-- Recent Customer Inquiries (Table Layout) -->
      <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Recent Customer Inquiries</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">Latest support interactions</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Tracking ID</th>
                <th class="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Customer</th>
                <th class="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th class="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <ng-container *ngIf="recentActivities().length > 0; else emptyTable">
                @for (activity of recentActivities(); track activity.id) {
                  <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <span class="material-symbols-outlined text-sm text-primary">support_agent</span>
                        </div>
                        <span class="font-medium text-slate-900 dark:text-white">{{ activity.trackingNumber }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {{ activity.customer }}
                    </td>
                    <td class="px-4 py-3">
                      <span 
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        [style.background-color]="activity.statusColor + '20'"
                        [style.color]="activity.statusColor">
                        {{ activity.status }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                      {{ activity.time }}
                    </td>
                  </tr>
                }
              </ng-container>
              <ng-template #emptyTable>
                <tr>
                  <td colspan="4" class="py-8 text-center text-slate-400">
                    <span class="material-symbols-outlined text-3xl mb-2">support_agent</span><br>
                    No customer inquiries yet.<br>Your latest support interactions will appear here.
                  </td>
                </tr>
              </ng-template>
            </tbody>
          </table>
        </div>
      </div>
  `,
})
export class DashboardComponent implements OnInit {
  private dashboard = useDashboardData();

  // Expose composable state for template
  inquiryPeriod = 7;
  urgentInquiriesCount = this.dashboard.urgentInquiriesCount;
  kpiCards = this.dashboard.kpiCards;
  isLoadingInquiryVolume = this.dashboard.isLoadingInquiryVolume;
  isLoadingInquiryPurpose = this.dashboard.isLoadingInquiryPurpose;
  inquiryVolumeData = this.dashboard.inquiryVolumeData;
  inquiryPurposeData = this.dashboard.inquiryPurposeData;
  recentActivities = this.dashboard.recentActivities;

  ngOnInit(): void {
    this.dashboard.loadAllData();
  }

  onInquiryPeriodChange(): void {
    this.dashboard.updateInquiryPeriod(this.inquiryPeriod);
  }
}

export default DashboardComponent;
