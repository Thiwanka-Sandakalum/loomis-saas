export interface Shipment {
    id: string;
    tenantId: string;
    trackingNumber: string;
    status: 'Created' | 'PickedUp' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
    shipmentType: 'Document' | 'Package';
    serviceType: 'Standard' | 'Express' | 'Overnight';

    // Sender details
    senderName: string;
    senderCompany?: string;
    senderAddress1: string;
    senderAddress2?: string;
    senderCity: string;
    senderCountry: string;
    senderPostalCode: string;
    senderPhone: string;
    senderEmail?: string;

    // Receiver details
    receiverName: string;
    receiverCompany?: string;
    receiverAddress1: string;
    receiverAddress2?: string;
    receiverCity: string;
    receiverCountry: string;
    receiverPostalCode: string;
    receiverPhone: string;
    receiverEmail?: string;

    // Package details
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    volumetricWeight?: number;

    // Pricing
    estimatedCost: number;
    actualCost?: number;
    currency: string;

    // Dates
    createdAt: Date;
    updatedAt: Date;
    pickupDate?: Date;
    estimatedDeliveryDate?: Date;
    actualDeliveryDate?: Date;

    // References
    customerReference?: string;
    invoiceNumber?: string;

    // Status events
    events?: ShipmentEvent[];
}

export interface ShipmentEvent {
    id: string;
    trackingNumber: string;
    status: string;
    location?: string;
    description: string;
    timestamp: Date;
}

export interface ShipmentFilters {
    status?: string[];
    serviceType?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
}

export interface ShipmentStats {
    total: number;
    created: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
}

export interface CreateShipmentRequest {
    shipmentType: 'Document' | 'Package';
    serviceType: 'Standard' | 'Express' | 'Overnight';
    senderName: string;
    senderAddress1: string;
    senderCity: string;
    senderCountry: string;
    senderPostalCode: string;
    senderPhone: string;
    receiverName: string;
    receiverAddress1: string;
    receiverCity: string;
    receiverCountry: string;
    receiverPostalCode: string;
    receiverPhone: string;
    weight: number;
    customerReference?: string;
}
