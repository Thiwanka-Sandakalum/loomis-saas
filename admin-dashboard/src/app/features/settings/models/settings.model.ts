export interface TenantSettings {
    id: string;
    tenantId: string;

    // Company Branding
    companyName: string;
    companyLogo?: string;
    primaryColor?: string;
    accentColor?: string;
    brandingTone?: 'Professional' | 'Friendly' | 'Casual';

    // Telegram Integration
    telegramBotToken?: string;
    telegramBotUsername?: string;
    telegramWebhookUrl?: string;
    telegramEnabled: boolean;

    // WhatsApp Integration (future)
    whatsappEnabled: boolean;
    whatsappApiKey?: string;

    // API Configuration
    apiKeysEnabled: boolean;
    webhookUrl?: string;
    webhookSecret?: string;

    // Notification Settings
    emailNotifications: boolean;
    smsNotifications: boolean;
    webhookNotifications: boolean;

    // Business Settings
    defaultCurrency: string;
    timezone: string;
    businessHours?: {
        start: string;
        end: string;
        days: string[];
    };

    updatedAt: Date;
    updatedBy: string;
}

export interface ApiKey {
    id: string;
    tenantId: string;
    name: string;
    key: string; // Masked for display
    prefix: string; // e.g., "cmp_live_"
    isActive: boolean;
    lastUsedAt?: Date;
    createdAt: Date;
    createdBy: string;
    expiresAt?: Date;
}

export interface CreateApiKeyRequest {
    name: string;
    expiresInDays?: number;
}

export interface UpdateSettingsRequest {
    companyName?: string;
    companyLogo?: string;
    primaryColor?: string;
    accentColor?: string;
    brandingTone?: 'Professional' | 'Friendly' | 'Casual';
    telegramBotToken?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    webhookNotifications?: boolean;
    defaultCurrency?: string;
    timezone?: string;
}

export interface WebhookTestResult {
    success: boolean;
    statusCode?: number;
    message: string;
    responseTime?: number;
}

export const AVAILABLE_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Australia/Sydney',
];

export const AVAILABLE_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR',
];
