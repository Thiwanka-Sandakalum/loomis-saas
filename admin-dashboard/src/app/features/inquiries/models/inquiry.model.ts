export interface Inquiry {
    id: string;
    tenantId: string;
    channel: 'telegram' | 'whatsapp' | 'web' | 'api';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    subject: string;
    description: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    assignedTo?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    messages: InquiryMessage[];
}

export interface InquiryMessage {
    id: string;
    inquiryId: string;
    fromUser: string;
    text: string;
    direction: 'inbound' | 'outbound';
    timestamp: Date;
}

export interface InquiryFilters {
    status?: string[];
    channel?: string[];
    priority?: string[];
    assignedTo?: string;
    search?: string;
}

export interface InquiryStats {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    urgent: number;
}
