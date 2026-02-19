import { Injectable, inject, signal } from '@angular/core';
import { OnboardingService } from '../../core/api-client/api/onboarding.service';
import { OnboardingStatusResponse } from '../../core/api-client/model/onboarding-status-response';

@Injectable({ providedIn: 'root' })
export class OnboardingStatusService {
    private onboardingApi = inject(OnboardingService);
    readonly status = signal<'not_started' | 'profile' | 'rates' | 'complete'>('not_started');
    readonly raw = signal<OnboardingStatusResponse | null>(null);

    async checkStatus(): Promise<'not_started' | 'profile' | 'rates' | 'complete'> {
        try {
            const resp = await this.onboardingApi.apiOnboardingStatusGet().toPromise();
            this.raw.set(resp ?? null);
            if (resp?.profileCompleted && resp?.ratesCompleted) {
                this.status.set('complete');
                return 'complete';
            } else if (!resp?.profileCompleted) {
                this.status.set('profile');
                return 'profile';
            } else if (!resp?.ratesCompleted) {
                this.status.set('rates');
                return 'rates';
            } else {
                this.status.set('not_started');
                return 'not_started';
            }
        } catch {
            this.status.set('not_started');
            return 'not_started';
        }
    }
}
