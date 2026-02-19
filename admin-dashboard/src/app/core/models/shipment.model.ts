export interface Shipment {
    id: string;
    trackingNumber: string;
    origin: Address;
    destination: Address;
    serviceType: 'Standard' | 'Express' | 'Overnight';
    weight: number;
    cost: number;
    status: ShipmentStatus;
    statusLabel?: string;
    eta: Date;
    customerName: string;
    customerPhone: string;
    createdAt: Date;
    updatedAt: Date;
    timeline: ShipmentEvent[];
    senderName?: string;
    senderPhone?: string;
    senderEmail?: string | null;
    receiverName?: string;
    receiverPhone?: string;
    receiverEmail?: string | null;
    parcelDescription?: string | null;
    parcelLength?: number | null;
    parcelWidth?: number | null;
    parcelHeight?: number | null;
    parcelValue?: number | null;
}

export interface Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export type ShipmentStatus =
    | 'pending'
    | 'picked-up'
    | 'in-transit'
    | 'out-for-delivery'
    | 'delivered'
    | 'delayed'
    | 'cancelled';

export interface ShipmentEvent {
    status: ShipmentStatus;
    location: string;
    timestamp: Date;
    notes?: string;
}

export interface CreateShipmentRequest {
    origin: Address;
    destination: Address;
    serviceType: 'Standard' | 'Express' | 'Overnight';
    weight: number;
    customerName: string;
    customerPhone: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ShipmentFilters {
    page?: number;
    pageSize?: number;
    status?: ShipmentStatus | 'all';
    serviceType?: string;
    searchQuery?: string;
    dateFrom?: Date;
    dateTo?: Date;
}
