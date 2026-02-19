/**
 * Fetch urgent inquiries (e.g., for immediate action/phone callback)
 * Assumes the API returns a list of inquiries with a 'status' field.
 * Filters for status 'urgent' or similar.
 */

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import {
    DashboardMetrics,
    ShipmentVolumeData,
    RecentActivity,
    InquiryVolumeData,
    InquiryPurposeData
} from '../models';
import { DashboardService as DashboardApiService } from '../api-client/api/dashboard.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private dashboardApi = inject(DashboardApiService);

    getMetrics(): Observable<DashboardMetrics> {
        return this.dashboardApi.apiDashboardOverviewGet().pipe(
            map((response) => this.mapOverviewToMetrics(response))
        );
    }

    getShipmentVolume(days: number = 7): Observable<ShipmentVolumeData[]> {
        const period = this.mapPeriod(days);
        return this.dashboardApi.apiDashboardShipmentsStatsGet(period).pipe(
            map((response) => this.mapTimeSeries(response, days))
        );
    }

    getInquiryVolume(days: number = 7): Observable<InquiryVolumeData[]> {
        const period = this.mapPeriod(days);
        return this.dashboardApi.apiDashboardComplaintsStatsGet(period).pipe(
            map((response) => this.mapTimeSeries(response, days))
        );
    }

    getInquiryPurposeBreakdown(): Observable<InquiryPurposeData[]> {
        return this.dashboardApi.apiDashboardComplaintsStatsGet('month').pipe(
            map((response) => this.mapPurposeBreakdown(response))
        );
    }

    getRecentActivity(limit: number = 10): Observable<RecentActivity[]> {
        return this.dashboardApi.apiDashboardOverviewGet().pipe(
            map((response) => this.mapRecentActivity(response, limit))
        );
    }
    /**
     * Fetch urgent inquiries count from the 'open' field in the API response.
     * Returns an object with the count for immediate action display.
     */
    getUrgentInquiries(): Observable<{ open: number }> {
        return this.dashboardApi.apiDashboardComplaintsStatsGet('week').pipe(
            map((response) => {
                if (this.isRecord(response) && typeof response['open'] === 'number') {
                    return { open: response['open'] };
                }
                return { open: 0 };
            })
        );
    }
    private mapOverviewToMetrics(response: unknown): DashboardMetrics {
        if (!this.isRecord(response)) {
            throw new Error('Invalid API response for dashboard metrics');
        }

        // Map API response keys to DashboardMetrics
        return {
            totalShipments: this.readNumber(response, ['totalShipments'], 0),
            deliveredToday: 0, // Not present in API response
            pendingShipments: this.readNumber(response, ['activeShipments'], 0),
            onTimeDeliveryRate: this.readNumber(response, ['deliveryRate'], 0),
            totalRevenue: this.readNumber(response, ['totalRevenue'], 0),
            activeDrivers: 0, // Not present in API response
            totalInquiries: this.readNumber(response, ['openComplaints'], 0),
            inquiriesHandledToday: 0, // Not present in API response
            inquiryResolutionRate: 0, // Not present in API response
            trends: {
                shipments: 0,
                revenue: 0,
                deliveryRate: 0,
                inquiries: 0
            },
        };
    }

    private mapTimeSeries(
        response: unknown,
        days: number
    ): { date: Date; count: number }[] {
        const items = this.extractArray(response);
        if (!items.length) {
            return [];
        }

        const mapped = items
            .map((item) => {
                if (!this.isRecord(item)) {
                    return null;
                }

                const dateValue = this.readDate(item, ['date', 'day', 'timestamp']);
                const countValue = this.readNumber(item, ['count', 'total', 'value'], undefined);

                if (!dateValue || countValue === undefined) {
                    return null;
                }

                return { date: dateValue, count: countValue };
            })
            .filter((item): item is { date: Date; count: number } => item !== null);

        return mapped;
    }

    private mapPurposeBreakdown(response: unknown): InquiryPurposeData[] {
        const items = this.extractArray(response);
        if (!items.length) {
            return [];
        }

        const mapped = items
            .map((item) => {
                if (!this.isRecord(item)) {
                    return null;
                }

                const purpose = this.readString(item, ['purpose', 'type', 'label', 'category', 'status'], 'Other');
                const count = this.readNumber(item, ['count', 'total', 'value'], undefined);

                if (count === undefined) {
                    return null;
                }

                return { purpose, count };
            })
            .filter((item): item is InquiryPurposeData => item !== null);

        return mapped;
    }

    private mapRecentActivity(response: unknown, limit: number): RecentActivity[] {
        if (!this.isRecord(response)) {
            return [];
        }

        const items = this.extractArray(response['recentActivity'] ?? response['recentActivities'] ?? response['activities']);
        if (!items.length) {
            return [];
        }

        const mapped = items
            .map((item) => {
                if (!this.isRecord(item)) {
                    return null;
                }

                const timestamp = this.readDate(item, ['timestamp', 'createdAt', 'time']);
                if (!timestamp) {
                    return null;
                }

                return {
                    id: this.readString(item, ['id', 'activityId'], crypto.randomUUID()),
                    type: this.readString(item, ['type'], 'inquiry') as 'shipment' | 'inquiry' | 'payment',
                    title: this.readString(item, ['title', 'trackingNumber', 'reference'], 'Activity'),
                    description: this.readString(item, ['description', 'customer', 'summary'], 'Recent activity'),
                    timestamp,
                    status: this.readString(item, ['status'], 'open'),
                };
            })
            .filter((item): item is RecentActivity => item !== null)
            .slice(0, limit);

        return mapped;
    }

    private mapPeriod(days: number): string {
        if (days <= 7) {
            return 'week';
        }
        if (days <= 30) {
            return 'month';
        }
        if (days <= 90) {
            return 'quarter';
        }
        return 'year';
    }

    private extractArray(response: unknown): unknown[] {
        if (Array.isArray(response)) {
            return response;
        }

        if (this.isRecord(response)) {
            const candidates = [response['data'], response['items'], response['results']];
            const array = candidates.find((candidate) => Array.isArray(candidate));
            return Array.isArray(array) ? array : [];
        }

        return [];
    }

    private readNumber(source: Record<string, unknown>, keys: string[], fallback: number | undefined): number {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
                return Number(value);
            }
        }

        return fallback ?? 0;
    }

    private readString(source: Record<string, unknown>, keys: string[], fallback: string): string {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'string' && value.trim() !== '') {
                return value;
            }
        }

        return fallback;
    }

    private readDate(source: Record<string, unknown>, keys: string[]): Date | null {
        for (const key of keys) {
            const value = source[key];
            if (value instanceof Date) {
                return value;
            }
            if (typeof value === 'string' || typeof value === 'number') {
                const parsed = new Date(value);
                if (!Number.isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        }

        return null;
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
    }

    // All mock data and fallback logic removed. Only real API data is used now.
}
