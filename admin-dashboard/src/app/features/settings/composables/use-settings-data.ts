import { inject, signal } from '@angular/core';
import { TenantSettings, ApiKey, CreateApiKeyRequest, UpdateSettingsRequest } from '../models/settings.model';

export function useSettingsData() {
    // State signals
    const settings = signal<TenantSettings | null>(null);
    const apiKeys = signal<ApiKey[]>([]);
    const isLoading = signal(false);
    const isSaving = signal(false);
    const isTestingWebhook = signal(false);

    // Actions
    const loadSettings = async () => {
        isLoading.set(true);
        try {
            // TODO: Call Core API endpoint
            // const response = await settingsService.apiSettingsGet();
            // settings.set(response.data);

            // Mock data
            const mockSettings: TenantSettings = {
                id: '1',
                tenantId: 'tenant-1',
                companyName: 'Acme Logistics',
                primaryColor: '#3B82F6',
                accentColor: '#10B981',
                brandingTone: 'Professional',
                telegramEnabled: false,
                whatsappEnabled: false,
                apiKeysEnabled: true,
                emailNotifications: true,
                smsNotifications: false,
                webhookNotifications: false,
                defaultCurrency: 'USD',
                timezone: 'America/New_York',
                updatedAt: new Date(),
                updatedBy: 'admin@example.com',
            };
            settings.set(mockSettings);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            isLoading.set(false);
        }
    };

    const updateSettings = async (request: UpdateSettingsRequest) => {
        isSaving.set(true);
        try {
            // TODO: Call Core API endpoint
            // await settingsService.apiSettingsPut({ updateSettingsRequest: request });

            // Optimistic update
            settings.update(current => current ? { ...current, ...request, updatedAt: new Date() } : null);

            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true, message: 'Settings updated successfully' };
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        } finally {
            isSaving.set(false);
        }
    };

    const loadApiKeys = async () => {
        try {
            // TODO: Call Core API endpoint
            // const response = await settingsService.apiSettingsApiKeysGet();
            // apiKeys.set(response.data);

            // Mock data
            const mockApiKeys: ApiKey[] = [
                {
                    id: '1',
                    tenantId: 'tenant-1',
                    name: 'Production API Key',
                    key: 'cmp_live_••••••••••••1234',
                    prefix: 'cmp_live_',
                    isActive: true,
                    lastUsedAt: new Date(),
                    createdAt: new Date('2024-01-15'),
                    createdBy: 'admin@example.com',
                },
            ];
            apiKeys.set(mockApiKeys);
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    };

    const createApiKey = async (request: CreateApiKeyRequest) => {
        try {
            // TODO: Call Core API endpoint
            // const response = await settingsService.apiSettingsApiKeysPost({ createApiKeyRequest: request });

            console.log('Creating API key:', request);
            await new Promise(resolve => setTimeout(resolve, 500));

            await loadApiKeys(); // Refresh list

            // Return full key (only shown once)
            return {
                success: true,
                key: 'cmp_live_1234567890abcdefghij',
                message: 'API key created. Save it now - you won\'t see it again!',
            };
        } catch (error) {
            console.error('Error creating API key:', error);
            throw error;
        }
    };

    const revokeApiKey = async (id: string) => {
        try {
            // TODO: Call Core API endpoint
            // await settingsService.apiSettingsApiKeysIdDelete({ id });

            apiKeys.update(keys => keys.filter(k => k.id !== id));
        } catch (error) {
            console.error('Error revoking API key:', error);
            throw error;
        }
    };

    const testWebhook = async (url: string) => {
        isTestingWebhook.set(true);
        try {
            // TODO: Call Core API endpoint to test webhook
            console.log('Testing webhook:', url);
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                success: true,
                statusCode: 200,
                message: 'Webhook test successful',
                responseTime: 245,
            };
        } catch (error) {
            console.error('Error testing webhook:', error);
            throw error;
        } finally {
            isTestingWebhook.set(false);
        }
    };

    const configureTelegramBot = async (token: string) => {
        try {
            // TODO: Call Core API endpoint to validate and configure bot
            console.log('Configuring Telegram bot with token:', token.substring(0, 10) + '...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            await updateSettings({ telegramBotToken: token });

            return {
                success: true,
                botUsername: 'acme_courier_bot',
                message: 'Telegram bot configured successfully',
            };
        } catch (error) {
            console.error('Error configuring Telegram bot:', error);
            throw error;
        }
    };

    return {
        // State
        settings: settings.asReadonly(),
        apiKeys: apiKeys.asReadonly(),
        isLoading: isLoading.asReadonly(),
        isSaving: isSaving.asReadonly(),
        isTestingWebhook: isTestingWebhook.asReadonly(),

        // Actions
        loadSettings,
        updateSettings,
        loadApiKeys,
        createApiKey,
        revokeApiKey,
        testWebhook,
        configureTelegramBot,
    };
}
