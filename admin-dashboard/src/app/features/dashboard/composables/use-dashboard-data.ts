import { inject, signal, computed, effect } from '@angular/core';
import { DashboardService } from '../../../core/services';
import type { LineChartData, PieChartData } from '../../../shared/components';

export interface KpiCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
  loading?: boolean;
}

export interface Activity {
  id: string;
  trackingNumber: string;
  customer: string;
  status: string;
  statusColor: string;
  time: string;
}

export function useDashboardData() {
  const dashboardService = inject(DashboardService);

  // State signals
  const inquiryPeriodSignal = signal<number>(7);
  const isLoadingInquiryVolume = signal<boolean>(true);
  const isLoadingInquiryPurpose = signal<boolean>(true);
  const urgentInquiriesCount = signal<number>(0);

  // Data signals
  const kpiCards = signal<KpiCard[]>([
    {
      title: 'Customers Handled',
      value: '-',
      change: '0%',
      trend: 'up',
      icon: 'support_agent',
      loading: true,
    },
    {
      title: 'Pending Pickups',
      value: '-',
      change: '0%',
      trend: 'up',
      icon: 'inventory_2',
      loading: true,
    },
    {
      title: 'Completed Shipments',
      value: '-',
      change: '0%',
      trend: 'up',
      icon: 'check_circle',
      loading: true,
    },
  ]);

  const inquiryVolumeData = signal<LineChartData>({ labels: [], datasets: [] });
  const inquiryPurposeData = signal<PieChartData>({ labels: [], datasets: [] });
  const recentActivities = signal<Activity[]>([]);

  // Computed values
  const isLoading = computed(
    () => isLoadingInquiryVolume() || isLoadingInquiryPurpose()
  );

  // Load functions
  function loadMetrics() {
    // Fetch urgent inquiries count from API
    dashboardService.getUrgentInquiries().subscribe({
      next: (data) => {
        urgentInquiriesCount.set(data.open ?? 0);
      },
      error: () => urgentInquiriesCount.set(0)
    });

    dashboardService.getMetrics().subscribe({
      next: (metrics) => {
        kpiCards.set([
          {
            title: 'Customers Handled',
            value: metrics.inquiriesHandledToday.toString(),
            change: `${metrics.trends.inquiries >= 0 ? '+' : ''}${metrics.trends.inquiries}%`,
            trend: metrics.trends.inquiries >= 0 ? 'up' : 'down',
            icon: 'support_agent',
          },
          {
            title: 'Pending Pickups',
            value: metrics.pendingShipments.toString(),
            change: '+2.4%',
            trend: 'up',
            icon: 'inventory_2',
          },
          {
            title: 'Completed Shipments',
            value: metrics.deliveredToday.toString(),
            change: `${metrics.trends.shipments >= 0 ? '+' : ''}${metrics.trends.shipments}%`,
            trend: metrics.trends.shipments >= 0 ? 'up' : 'down',
            icon: 'check_circle',
          },
        ]);
      },
    });
  }

  function loadInquiryVolume() {
    isLoadingInquiryVolume.set(true);
    dashboardService.getInquiryVolume(inquiryPeriodSignal()).subscribe({
      next: (data) => {
        const labels = data.map((d) =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        const values = data.map((d) => d.count);

        inquiryVolumeData.set({
          labels,
          datasets: [
            {
              label: 'Inquiries',
              data: values,
              borderColor: '#6324eb',
              backgroundColor: 'rgba(99, 36, 235, 0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        });
        isLoadingInquiryVolume.set(false);
      },
    });
  }

  function loadInquiryPurpose() {
    isLoadingInquiryPurpose.set(true);
    dashboardService.getInquiryPurposeBreakdown().subscribe({
      next: (data) => {
        inquiryPurposeData.set({
          labels: data.map((d) => d.purpose),
          datasets: [
            {
              data: data.map((d) => d.count),
              backgroundColor: ['#6324eb', '#a855f7', '#ec4899', '#ef4444', '#f59e0b'],
            },
          ],
        });
        isLoadingInquiryPurpose.set(false);
      },
    });
  }

  function loadRecentActivity() {
    dashboardService.getRecentActivity(10).subscribe({
      next: (activities) => {
        const mappedActivities: Activity[] = activities.map((a) => ({
          id: a.id,
          trackingNumber: a.title,
          customer: a.description,
          status: a.status,
          statusColor: getStatusColor(a.status),
          time: formatTime(a.timestamp),
        }));
        recentActivities.set(mappedActivities);
      },
    });
  }

  function loadAllData() {
    loadMetrics();
    loadInquiryVolume();
    loadInquiryPurpose();
    loadRecentActivity();
  }

  function updateInquiryPeriod(period: number) {
    inquiryPeriodSignal.set(period);
    loadInquiryVolume();
  }

  // Helper functions
  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      resolved: '#10b981',
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      open: '#6366f1',
      closed: '#6b7280',
      in_transit: '#10b981',
      delivered: '#10b981',
      cancelled: '#ef4444',
      delayed: '#f59e0b',
    };
    return colorMap[status] || '#6b7280';
  }

  function formatTime(timestamp: Date): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  return {
    // State
    inquiryPeriodSignal,
    isLoadingInquiryVolume,
    isLoadingInquiryPurpose,
    urgentInquiriesCount,
    kpiCards,
    inquiryVolumeData,
    inquiryPurposeData,
    recentActivities,
    isLoading,
    // Actions
    loadAllData,
    updateInquiryPeriod,
    getStatusColor,
    formatTime,
  };
}
