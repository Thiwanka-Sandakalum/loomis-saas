import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Inquiry, InquiryFilters } from '../models';
import { ComplaintsService } from '../api-client/api/complaints.service';
import { UpdateComplaintRequest } from '../api-client/model/updateComplaintRequest';

@Injectable({ providedIn: 'root' })
export class InquiryService {
    private complaintsApi = inject(ComplaintsService);

    private fallbackPage(page: number, pageSize: number): InquiryPage {
        return {
            data: [],
            pagination: {
                page,
                pageSize,
                totalItems: 0,
                totalPages: 1
            }
        };
    }

    getInquiries(filters: InquiryFilters = {}): Observable<InquiryPage> {
        const page = filters.page ?? 1;
        const pageSize = filters.pageSize ?? 20;
        const status = this.normalizeStatusParam(filters.status);
        const type = filters.channel && filters.channel !== 'all' ? filters.channel : undefined;

        return this.complaintsApi.apiComplaintsGet(status, type, page, pageSize).pipe(
            map((response) => this.mapComplaintPage(response, page, pageSize, filters.searchQuery)),
            catchError(() => of(this.fallbackPage(page, pageSize)))
        );
    }

    getInquiryById(id: string): Observable<Inquiry> {
        return this.complaintsApi.apiComplaintsComplaintIdGet(id).pipe(
            map((response) => this.mapComplaintToInquiry(response) ?? this.createUnknownInquiry(id)),
            catchError(() => of(this.createUnknownInquiry(id)))
        );
    }

    updateInquiryStatus(id: string, status: Inquiry['status']): Observable<Inquiry> {
        const payload: UpdateComplaintRequest = { status };
        return this.complaintsApi.apiComplaintsComplaintIdPatch(id, payload).pipe(
            map((response) => this.mapComplaintToInquiry(response) ?? this.createUnknownInquiry(id)),
            catchError(() => of(this.createUnknownInquiry(id)))
        );
    }

    assignInquiry(id: string, agentId: string): Observable<Inquiry> {
        const payload: UpdateComplaintRequest = { assignedTo: agentId };
        return this.complaintsApi.apiComplaintsComplaintIdPatch(id, payload).pipe(
            map((response) => this.mapComplaintToInquiry(response) ?? this.createUnknownInquiry(id)),
            catchError(() => of(this.createUnknownInquiry(id)))
        );
    }

    sendMessage(inquiryId: string, content: string): Observable<void> {
        const payload: UpdateComplaintRequest = { resolution: content };
        return this.complaintsApi.apiComplaintsComplaintIdPatch(inquiryId, payload).pipe(
            map(() => undefined),
            catchError(() => of(undefined))
        );
    }

    markAsRead(inquiryId: string): Observable<void> {
        const payload: UpdateComplaintRequest = { status: 'in-progress' };
        return this.complaintsApi.apiComplaintsComplaintIdPatch(inquiryId, payload).pipe(
            map(() => undefined),
            catchError(() => of(undefined))
        );
    }

    private mapComplaintPage(
        response: unknown,
        page: number,
        pageSize: number,
        searchQuery?: string
    ): InquiryPage {
        const items = this.extractArray(response);
        const mapped = items
            .map((item) => this.mapComplaintToInquiry(item))
            .filter((item): item is Inquiry => item !== null);

        const filtered = searchQuery
            ? mapped.filter((inquiry) => this.matchesSearch(inquiry, searchQuery))
            : mapped;

        const pagination = this.extractPagination(response, page, pageSize, filtered.length);

        return { data: filtered, pagination };
    }

    private mapComplaintToInquiry(item: unknown): Inquiry | null {
        if (!this.isRecord(item)) {
            return null;
        }

        const id = this.readString(item, ['id', 'complaintId', 'reference', 'trackingNumber'], crypto.randomUUID());
        const channel = this.normalizeChannel(this.readString(item, ['channel', 'type', 'source'], 'api'));
        const status = this.normalizeStatus(this.readString(item, ['status', 'state'], 'open'));
        const priority = this.normalizePriority(this.readString(item, ['priority', 'priorityLevel'], 'medium'));

        const createdAt = this.readDate(item, ['createdAt', 'created_at', 'timestamp']) ?? new Date();
        const updatedAt = this.readDate(item, ['updatedAt', 'updated_at', 'lastUpdated']) ?? createdAt;

        const messages = this.extractArray(item['messages']).map((message) => this.mapMessage(message));

        return {
            id,
            customerName: this.readString(item, ['customerName', 'name', 'customer', 'fullName'], 'Unknown Customer'),
            customerPhone: this.readString(item, ['customerPhone', 'phone', 'contact'], 'N/A'),
            channel,
            status,
            priority,
            subject: this.readString(item, ['subject', 'title', 'reason'], 'Customer Inquiry'),
            messagePreview: this.readString(item, ['messagePreview', 'message', 'summary', 'description', 'latestMessage'], 'No message available'),
            messages,
            assignedTo: this.readString(item, ['assignedTo', 'assignee'], ''),
            createdAt,
            updatedAt
        };
    }

    private mapMessage(message: unknown): { id: string; sender: 'customer' | 'agent' | 'system'; content: string; timestamp: Date; read: boolean } {
        if (!this.isRecord(message)) {
            return {
                id: crypto.randomUUID(),
                sender: 'system',
                content: 'Message unavailable',
                timestamp: new Date(),
                read: true
            };
        }

        return {
            id: this.readString(message, ['id', 'messageId'], crypto.randomUUID()),
            sender: this.normalizeSender(this.readString(message, ['sender', 'from'], 'system')),
            content: this.readString(message, ['content', 'message', 'body'], 'Message unavailable'),
            timestamp: this.readDate(message, ['timestamp', 'createdAt', 'time']) ?? new Date(),
            read: this.readBoolean(message, ['read', 'isRead'], true)
        };
    }

    private createUnknownInquiry(id: string): Inquiry {
        return {
            id,
            customerName: 'Unknown Customer',
            customerPhone: 'N/A',
            channel: 'api',
            status: 'open',
            priority: 'medium',
            subject: 'Customer Inquiry',
            messagePreview: 'No details available',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    private extractPagination(
        response: unknown,
        page: number,
        pageSize: number,
        totalFallback: number
    ): { page: number; pageSize: number; totalItems: number; totalPages: number } {
        if (!this.isRecord(response)) {
            return this.buildPagination(page, pageSize, totalFallback);
        }

        const meta = this.isRecord(response['pagination']) ? response['pagination'] : this.isRecord(response['meta']) ? response['meta'] : response;
        if (!this.isRecord(meta)) {
            return this.buildPagination(page, pageSize, totalFallback);
        }

        const totalItems = this.readNumber(meta, ['totalItems', 'total', 'count'], totalFallback);
        const resolvedPage = this.readNumber(meta, ['page', 'currentPage'], page);
        const resolvedPageSize = this.readNumber(meta, ['pageSize', 'perPage'], pageSize);
        const totalPages = this.readNumber(meta, ['totalPages', 'pages'], Math.max(1, Math.ceil(totalItems / resolvedPageSize)));

        return {
            page: resolvedPage,
            pageSize: resolvedPageSize,
            totalItems,
            totalPages
        };
    }

    private buildPagination(page: number, pageSize: number, totalItems: number) {
        return {
            page,
            pageSize,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
        };
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

    private matchesSearch(inquiry: Inquiry, query: string): boolean {
        const normalized = query.toLowerCase();
        return (
            inquiry.customerName.toLowerCase().includes(normalized) ||
            inquiry.id.toLowerCase().includes(normalized) ||
            inquiry.messagePreview.toLowerCase().includes(normalized)
        );
    }

    private normalizeChannel(value: string): Inquiry['channel'] {
        const normalized = value.toLowerCase();
        if (normalized.includes('whatsapp')) return 'whatsapp';
        if (normalized.includes('telegram')) return 'telegram';
        if (normalized.includes('widget')) return 'widget';
        return 'api';
    }

    private normalizeSender(value: string): 'customer' | 'agent' | 'system' {
        const normalized = value.toLowerCase();
        if (normalized.includes('customer')) return 'customer';
        if (normalized.includes('agent')) return 'agent';
        return 'system';
    }

    private normalizeStatus(value: string): Inquiry['status'] {
        const normalized = value.toLowerCase().replace(/_/g, '-');
        if (normalized.includes('pending')) return 'pending';
        if (normalized.includes('resolved')) return 'resolved';
        if (normalized.includes('closed')) return 'closed';
        if (normalized.includes('in-progress') || normalized.includes('inprogress')) return 'in-progress';
        return 'open';
    }

    private normalizeStatusParam(value?: InquiryFilters['status']): string | undefined {
        if (!value || value === 'all') {
            return undefined;
        }
        if (value === 'in-progress') {
            return 'in_progress';
        }
        return value;
    }

    private normalizePriority(value: string): Inquiry['priority'] {
        const normalized = value.toLowerCase();
        if (normalized.includes('urgent')) return 'urgent';
        if (normalized.includes('high')) return 'high';
        if (normalized.includes('low')) return 'low';
        return 'medium';
    }

    private readNumber(source: Record<string, unknown>, keys: string[], fallback: number): number {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
                return Number(value);
            }
        }
        return fallback;
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

    private readBoolean(source: Record<string, unknown>, keys: string[], fallback: boolean): boolean {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'boolean') {
                return value;
            }
        }
        return fallback;
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
    }
}

export interface InquiryPage {
    data: Inquiry[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}
