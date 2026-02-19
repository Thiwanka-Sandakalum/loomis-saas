export interface DashboardMetrics {
    totalShipments: number;
    deliveredToday: number;
    pendingShipments: number;
    onTimeDeliveryRate: number;
    totalRevenue: number;
    activeDrivers: number;
    // Inquiry metrics
    totalInquiries: number;
    inquiriesHandledToday: number;
    inquiryResolutionRate: number;
    trends: {
        shipments: number; // percentage change
        revenue: number;
        deliveryRate: number;
        inquiries: number; // percentage change
    };
}

export interface ShipmentVolumeData {
    date: Date;
    count: number;
}

export interface InquiryVolumeData {
    date: Date;
    count: number;
}

export interface InquiryPurposeData {
    purpose: string;
    count: number;
}

export interface RecentActivity {
    id: string;
    type: 'shipment' | 'inquiry' | 'payment';
    title: string;
    description: string;
    timestamp: Date;
    status: string;
}
