import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tenant, TenantSetup, TenantResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    private readonly TENANT_STORAGE = 'loomis_tenant';

    readonly currentTenant = signal<Tenant | null>(this.loadTenant());

    createTenant(data: TenantSetup): Observable<TenantResponse> {
        return this.http.post<TenantResponse>(`${this.apiUrl}/tenants`, data).pipe(
            tap(response => {
                this.setTenant(response.tenant);
            })
        );
    }

    setTenant(tenant: Tenant): void {
        localStorage.setItem(this.TENANT_STORAGE, JSON.stringify(tenant));
        this.currentTenant.set(tenant);
    }

    private loadTenant(): Tenant | null {
        const stored = localStorage.getItem(this.TENANT_STORAGE);
        return stored ? JSON.parse(stored) : null;
    }

    clearTenant(): void {
        localStorage.removeItem(this.TENANT_STORAGE);
        this.currentTenant.set(null);
    }

    isOnboardingComplete(): boolean {
        const tenant = this.currentTenant();
        return !!tenant?.isOnboardingComplete;
    }

    getApiKey(): string | null {
        const tenant = this.currentTenant();
        return tenant?.apiKey || null;
    }

    logout(): void {
        this.clearTenant();
        // Additional logout logic if needed
    }
}
