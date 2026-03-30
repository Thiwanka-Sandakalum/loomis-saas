import 'dotenv/config';

const API_BASE_URL = process.env.CORE_API_URL || 'http://localhost:5000';

interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    status: number;
}

export class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
        body?: any,
        retries: number = 3
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const apiKey = process.env.CORE_API_KEY;
        if (apiKey) {
            headers['X-API-KEY'] = apiKey;
        }

        const options: RequestInit = {
            method,
            headers,
        };

        if (body && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeout);

                const data = await response.json();

                // Don't retry client errors (4xx) — only server errors
                if (response.status >= 500 && attempt < retries) {
                    await this.delay(Math.pow(2, attempt) * 100);
                    continue;
                }

                return { data, status: response.status };
            } catch (error: any) {
                if (attempt === retries) {
                    return {
                        error: error.name === 'AbortError'
                            ? `Request timeout after 8s: ${endpoint}`
                            : error.message || 'API request failed',
                        status: 500,
                    };
                }
                await this.delay(Math.pow(2, attempt) * 100);
            }
        }

        return { error: 'Max retries exceeded', status: 500 };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Shipment API Calls
    async createShipment(payload: {
        sender: any;
        receiver: any;
        parcel: any;
        serviceType: string;
        conversationId?: string;
    }) {
        return this.makeRequest('/api/ai/shipments/create', 'POST', payload);
    }

    async trackShipment(trackingNumber: string) {
        return this.makeRequest(`/api/ai/shipments/tracking/${trackingNumber}`, 'GET');
    }

    // Rate API Call
    async inquireRate(payload: {
        weight: number;
        serviceType: string;
        origin: string;
        destination: string;
    }) {
        return this.makeRequest('/api/ai/rates/inquiry', 'POST', payload);
    }

    // Complaint API Call
    async fileComplaint(payload: {
        trackingNumber: string;
        description: string;
        type: string;
        customerContact: string;
    }) {
        return this.makeRequest('/api/ai/complaints/file', 'POST', payload);
    }

    // Payment API Call
    async processPayment(payload: {
        trackingNumber: string;
        amount: number;
        method: string;
        transactionId?: string;
    }) {
        return this.makeRequest('/api/payments', 'POST', payload);
    }

    // Dashboard/Stats API Call
    async getDashboardOverview() {
        return this.makeRequest('/api/dashboard/overview', 'GET');
    }

    // Customer lookup
    async getCustomer(phoneOrEmail: string) {
        return this.makeRequest(`/api/ai/customers/${phoneOrEmail}`, 'GET');
    }
}

export const apiClient = new ApiClient();
