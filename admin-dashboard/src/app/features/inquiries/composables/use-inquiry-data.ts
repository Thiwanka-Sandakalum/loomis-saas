import { signal, computed } from '@angular/core';
import { Inquiry, InquiryFilters, InquiryStats } from '../models/inquiry.model';

export function useInquiryData() {
    // Signals for state management
    const inquiries = signal<Inquiry[]>([]);
    const filters = signal<InquiryFilters>({});
    const isLoading = signal(false);
    const selectedInquiry = signal<Inquiry | null>(null);

    // Computed values
    const filteredInquiries = computed(() => {
        let result = inquiries();
        const currentFilters = filters();

        if (currentFilters.status && currentFilters.status.length > 0) {
            result = result.filter((inq) => currentFilters.status!.includes(inq.status));
        }

        if (currentFilters.channel && currentFilters.channel.length > 0) {
            result = result.filter((inq) => currentFilters.channel!.includes(inq.channel));
        }

        if (currentFilters.priority && currentFilters.priority.length > 0) {
            result = result.filter((inq) => currentFilters.priority!.includes(inq.priority));
        }

        if (currentFilters.assignedTo) {
            result = result.filter((inq) => inq.assignedTo === currentFilters.assignedTo);
        }

        if (currentFilters.search) {
            const search = currentFilters.search.toLowerCase();
            result = result.filter(
                (inq) =>
                    inq.subject.toLowerCase().includes(search) ||
                    inq.description.toLowerCase().includes(search) ||
                    inq.customerName.toLowerCase().includes(search)
            );
        }

        return result;
    });

    const stats = computed<InquiryStats>(() => {
        const all = inquiries();
        return {
            total: all.length,
            open: all.filter((i) => i.status === 'open').length,
            in_progress: all.filter((i) => i.status === 'in_progress').length,
            resolved: all.filter((i) => i.status === 'resolved').length,
            urgent: all.filter((i) => i.priority === 'urgent').length,
        };
    });

    // Actions
    const loadInquiries = async () => {
        isLoading.set(true);
        try {
            // TODO: Replace with actual API call
            // const response = await inquiryService.getAll();
            // inquiries.set(response.data);

            // Mock data for now
            inquiries.set([
                {
                    id: '1',
                    tenantId: 'tenant1',
                    channel: 'telegram',
                    status: 'open',
                    subject: 'Package not delivered',
                    description: 'My package was supposed to arrive yesterday but I haven\'t received it yet.',
                    customerId: 'cust1',
                    customerName: 'John Doe',
                    customerEmail: 'john@example.com',
                    priority: 'high',
                    createdAt: new Date('2026-02-17'),
                    updatedAt: new Date('2026-02-17'),
                    messages: [],
                },
                {
                    id: '2',
                    tenantId: 'tenant1',
                    channel: 'web',
                    status: 'in_progress',
                    subject: 'Damaged item',
                    description: 'The item I received is damaged.',
                    customerId: 'cust2',
                    customerName: 'Jane Smith',
                    assignedTo: 'agent1',
                    priority: 'urgent',
                    createdAt: new Date('2026-02-16'),
                    updatedAt: new Date('2026-02-18'),
                    messages: [],
                },
            ]);
        } catch (error) {
            console.error('Error loading inquiries:', error);
        } finally {
            isLoading.set(false);
        }
    };

    const updateFilters = (newFilters: Partial<InquiryFilters>) => {
        filters.update((current) => ({ ...current, ...newFilters }));
    };

    const selectInquiry = (inquiry: Inquiry | null) => {
        selectedInquiry.set(inquiry);
    };

    const updateInquiryStatus = async (inquiryId: string, newStatus: Inquiry['status']) => {
        try {
            // TODO: API call
            // await inquiryService.updateStatus(inquiryId, newStatus);

            inquiries.update((items) =>
                items.map((inq) =>
                    inq.id === inquiryId ? { ...inq, status: newStatus, updatedAt: new Date() } : inq
                )
            );
        } catch (error) {
            console.error('Error updating inquiry status:', error);
            throw error;
        }
    };

    const assignInquiry = async (inquiryId: string, agentId: string) => {
        try {
            // TODO: API call
            // await inquiryService.assign(inquiryId, agentId);

            inquiries.update((items) =>
                items.map((inq) =>
                    inq.id === inquiryId ? { ...inq, assignedTo: agentId, updatedAt: new Date() } : inq
                )
            );
        } catch (error) {
            console.error('Error assigning inquiry:', error);
            throw error;
        }
    };

    const sendReply = async (inquiryId: string, message: string) => {
        try {
            // TODO: API call
            // await inquiryService.sendReply(inquiryId, message);

            console.log('Sending reply to inquiry', inquiryId, message);
        } catch (error) {
            console.error('Error sending reply:', error);
            throw error;
        }
    };

    return {
        // State
        inquiries: inquiries.asReadonly(),
        filteredInquiries,
        filters: filters.asReadonly(),
        isLoading: isLoading.asReadonly(),
        selectedInquiry: selectedInquiry.asReadonly(),
        stats,

        // Actions
        loadInquiries,
        updateFilters,
        selectInquiry,
        updateInquiryStatus,
        assignInquiry,
        sendReply,
    };
}
