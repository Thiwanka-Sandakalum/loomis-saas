export interface Inquiry {
    id: string;
    customerName: string;
    customerPhone: string;
    channel: 'whatsapp' | 'telegram' | 'api' | 'widget';
    status: 'open' | 'pending' | 'in-progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    subject: string;
    messagePreview: string;
    messages: Message[];
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    sender: 'customer' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    read: boolean;
}

export interface InquiryFilters {
    channel?: 'all' | 'whatsapp' | 'telegram' | 'api' | 'widget';
    status?: 'all' | 'open' | 'pending' | 'in-progress' | 'resolved' | 'closed';
    searchQuery?: string;
    page?: number;
    pageSize?: number;
}
