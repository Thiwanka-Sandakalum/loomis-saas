import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { useSettingsData } from './composables/use-settings-data';
import { AVAILABLE_TIMEZONES, AVAILABLE_CURRENCIES } from './models/settings.model';

@Component({
    selector: 'app-settings-hub',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="mx-auto w-full max-w-5xl flex flex-col gap-8 pb-24">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Settings Hub</h1>
            <p class="text-slate-500">Configure your platform settings and integrations.</p>
            
            <!-- Placeholder content -->
            <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p>Settings hub under construction. Use main Settings page for configuration.</p>
            </div>
        </div>
    `,
})
export class SettingsHubComponent implements OnInit {
    protected settingsData = useSettingsData();
    protected brandingForm: FormGroup;
    protected telegramForm: FormGroup;
    protected webhookForm: FormGroup;
    protected notificationForm: FormGroup;
    protected businessForm: FormGroup;
    protected createKeyForm: FormGroup;
    protected isCreateKeyModalOpen = signal(false);
    protected newApiKey = signal<string | null>(null);
    protected availableTimezones = AVAILABLE_TIMEZONES;
    protected availableCurrencies = AVAILABLE_CURRENCIES;

    constructor(private fb: FormBuilder) {
        this.brandingForm = this.fb.group({
            companyName: ['', Validators.required],
            primaryColor: ['#3B82F6'],
            accentColor: ['#10B981'],
            brandingTone: ['Professional'],
        });

        this.telegramForm = this.fb.group({
            telegramBotToken: [''],
        });

        this.webhookForm = this.fb.group({
            webhookUrl: ['', Validators.pattern(/^https?:\/\/.+/)],
            webhookSecret: [''],
        });

        this.notificationForm = this.fb.group({
            emailNotifications: [true],
            smsNotifications: [false],
            webhookNotifications: [false],
        });

        this.businessForm = this.fb.group({
            defaultCurrency: ['USD', Validators.required],
            timezone: ['America/New_York', Validators.required],
        });

        this.createKeyForm = this.fb.group({
            name: ['', Validators.required],
            expiresInDays: [null],
        });
    }

    async ngOnInit() {
        await this.settingsData.loadSettings();
        await this.settingsData.loadApiKeys();

        if (this.settingsData.settings()) {
            const settings = this.settingsData.settings()!;
            this.brandingForm.patchValue(settings);
            this.telegramForm.patchValue({ telegramBotToken: settings.telegramBotToken || '' });
            this.webhookForm.patchValue(settings);
            this.notificationForm.patchValue(settings);
            this.businessForm.patchValue(settings);
        }
    }

    async saveBranding() {
        if (this.brandingForm.valid) {
            try {
                await this.settingsData.updateSettings(this.brandingForm.value);
            } catch (error) {
                console.error('Error saving branding:', error);
            }
        }
    }

    async configureTelegram() {
        const token = this.telegramForm.get('telegramBotToken')?.value;
        if (token) {
            try {
                const result = await this.settingsData.configureTelegramBot(token);
                alert(`Telegram bot configured: @${result.botUsername}`);
            } catch (error) {
                console.error('Error configuring Telegram:', error);
            }
        }
    }

    async testWebhook() {
        const url = this.webhookForm.get('webhookUrl')?.value;
        if (url) {
            try {
                const result = await this.settingsData.testWebhook(url);
                alert(`Webhook test ${result.success ? 'successful' : 'failed'}: ${result.message}`);
            } catch (error) {
                console.error('Error testing webhook:', error);
            }
        }
    }

    async saveWebhook() {
        if (this.webhookForm.valid) {
            try {
                await this.settingsData.updateSettings(this.webhookForm.value);
            } catch (error) {
                console.error('Error saving webhook:', error);
            }
        }
    }

    async saveNotifications() {
        try {
            await this.settingsData.updateSettings(this.notificationForm.value);
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    }

    async saveBusinessSettings() {
        if (this.businessForm.valid) {
            try {
                await this.settingsData.updateSettings(this.businessForm.value);
            } catch (error) {
                console.error('Error saving business settings:', error);
            }
        }
    }

    showCreateKeyModal() {
        this.isCreateKeyModalOpen.set(true);
        this.newApiKey.set(null);
        this.createKeyForm.reset();
    }

    closeCreateKeyModal() {
        this.isCreateKeyModalOpen.set(false);
        this.newApiKey.set(null);
    }

    async createApiKey() {
        if (this.createKeyForm.valid) {
            try {
                const result = await this.settingsData.createApiKey(this.createKeyForm.value);
                this.newApiKey.set(result.key!);
            } catch (error) {
                console.error('Error creating API key:', error);
            }
        }
    }

    async revokeKey(id: string, name: string) {
        if (confirm(`Are you sure you want to revoke "${name}"? This cannot be undone.`)) {
            try {
                await this.settingsData.revokeApiKey(id);
            } catch (error) {
                console.error('Error revoking API key:', error);
            }
        }
    }

    copyApiKey() {
        const key = this.newApiKey();
        if (key) {
            navigator.clipboard.writeText(key);
            alert('API key copied to clipboard!');
        }
    }
}
