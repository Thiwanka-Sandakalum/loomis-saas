export interface Rate {
    id: string;
    tenantId: string;
    serviceType: 'Standard' | 'Express' | 'Overnight';
    shipmentType: 'Document' | 'Package';
    originCountry?: string;
    destinationCountry?: string;
    zone?: string;

    // Weight-based pricing
    minWeight: number;
    maxWeight: number;
    basePrice: number;
    pricePerKg: number;

    // Volumetric weight
    volumetricDivisor: number;

    // Surcharges
    fuelSurchargePercent: number;
    remoteSurcharge?: number;

    currency: string;
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export interface RateCalculationRequest {
    serviceType: 'Standard' | 'Express' | 'Overnight';
    shipmentType: 'Document' | 'Package';
    originCountry: string;
    destinationCountry: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
}

export interface RateCalculationResponse {
    basePrice: number;
    weightCharge: number;
    fuelSurcharge: number;
    remoteSurcharge: number;
    totalPrice: number;
    currency: string;
    volumetricWeight?: number;
}

export interface CreateRateRequest {
    serviceType: 'Standard' | 'Express' | 'Overnight';
    shipmentType: 'Document' | 'Package';
    originCountry?: string;
    destinationCountry?: string;
    zone?: string;
    minWeight: number;
    maxWeight: number;
    basePrice: number;
    pricePerKg: number;
    volumetricDivisor: number;
    fuelSurchargePercent: number;
    remoteSurcharge?: number;
    currency: string;
}
