export interface Tenant {
    id: string;
    companyName: string;
    country: string;
    companySize: '1-10' | '11-50' | '51-200' | '200+';
    apiKey: string;
    createdAt: Date;
    isOnboardingComplete: boolean;
}

export interface TenantSetup {
    companyName: string;
    country: string;
    companySize: string;
    services: ServiceRate[];
    integrations: string[];
}

export interface ServiceRate {
    type: 'Standard' | 'Express' | 'Overnight';
    baseRate: number;
    additionalPerKg: number;
    enabled: boolean;
}

export interface TenantResponse {
    tenant: Tenant;
    apiKey: string;
}
