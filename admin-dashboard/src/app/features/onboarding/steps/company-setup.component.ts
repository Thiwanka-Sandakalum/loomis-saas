import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../../../core/api-client/api/onboarding.service';

// ─── Custom Validators ────────────────────────────────────────────────────────

function urlValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null; // let `required` handle the empty case
  try {
    new URL(control.value);
    return null;
  } catch {
    return { url: 'Enter a valid website URL (e.g. https://yourcompany.com).' };
  }
}

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  // E.164-ish: optional +, then 7–15 digits, spaces or hyphens allowed
  const valid = /^\+?[\d]{1}[\d\s\-().]{6,19}$/.test(control.value.trim());
  return valid ? null : { phone: 'Enter a valid phone number (e.g. +1 555-123-4567).' };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-company-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-shell">
      <div class="card">

        <!-- Header -->
        <div class="card-header">
          <div class="icon-wrap">
            <span class="material-symbols-outlined">business</span>
          </div>
          <h1>Company Setup</h1>
          <p>Tell us about your organization to personalise your Loomis experience.</p>
        </div>

        <!-- Success banner -->
        <div *ngIf="successMessage" class="banner banner--success" role="status">
          <span class="material-symbols-outlined">check_circle</span>
          {{ successMessage }}
        </div>

        <!-- Error banner -->
        <div *ngIf="error" class="banner banner--error" role="alert">
          <span class="material-symbols-outlined">error</span>
          <span>
            {{ error }}
            <ul *ngIf="errorDetails.length" class="banner-list">
              <li *ngFor="let detail of errorDetails">{{ detail }}</li>
            </ul>
          </span>
        </div>

        <!-- Form -->
        <form [formGroup]="form" novalidate (ngSubmit)="submit()" class="form-body">

          <!-- Organization Name -->
          <div class="field">
            <label for="organizationName">Organization Name <span aria-hidden="true">*</span></label>
            <input
              id="organizationName"
              type="text"
              formControlName="organizationName"
              placeholder="e.g. Loomis Logistics"
              [class.input--invalid]="isDirtyInvalid('organizationName')"
              autocomplete="organization"
            />
            <p *ngIf="isDirtyInvalid('organizationName')" class="field-error" role="alert">
              {{ firstError('organizationName') }}
            </p>
          </div>

          <!-- Corporate Website -->
          <div class="field">
            <label for="corporateWebsite">Corporate Website <span aria-hidden="true">*</span></label>
            <input
              id="corporateWebsite"
              type="url"
              formControlName="corporateWebsite"
              placeholder="https://yourcompany.com"
              [class.input--invalid]="isDirtyInvalid('corporateWebsite')"
              autocomplete="url"
            />
            <p *ngIf="isDirtyInvalid('corporateWebsite')" class="field-error" role="alert">
              {{ firstError('corporateWebsite') }}
            </p>
          </div>

          <!-- Primary Language -->
          <div class="field">
            <label for="primaryLanguage">Primary Language <span aria-hidden="true">*</span></label>
            <input
              id="primaryLanguage"
              type="text"
              formControlName="primaryLanguage"
              placeholder="e.g. English"
              [class.input--invalid]="isDirtyInvalid('primaryLanguage')"
            />
            <p *ngIf="isDirtyInvalid('primaryLanguage')" class="field-error" role="alert">
              {{ firstError('primaryLanguage') }}
            </p>
          </div>

          <!-- Description -->
          <div class="field">
            <label for="description">Description <span aria-hidden="true">*</span></label>
            <textarea
              id="description"
              rows="3"
              formControlName="description"
              placeholder="Briefly describe your company"
              [class.input--invalid]="isDirtyInvalid('description')"
            ></textarea>
            <p *ngIf="isDirtyInvalid('description')" class="field-error" role="alert">
              {{ firstError('description') }}
            </p>
          </div>

          <!-- Support Email + Phone (side-by-side on md+) -->
          <div class="field-row">
            <div class="field">
              <label for="supportEmail">Support Email <span aria-hidden="true">*</span></label>
              <input
                id="supportEmail"
                type="email"
                formControlName="supportEmail"
                placeholder="support@yourcompany.com"
                [class.input--invalid]="isDirtyInvalid('supportEmail')"
                autocomplete="email"
              />
              <p *ngIf="isDirtyInvalid('supportEmail')" class="field-error" role="alert">
                {{ firstError('supportEmail') }}
              </p>
            </div>
            <div class="field">
              <label for="supportPhone">Support Phone <span aria-hidden="true">*</span></label>
              <input
                id="supportPhone"
                type="tel"
                formControlName="supportPhone"
                placeholder="+1 555-123-4567"
                [class.input--invalid]="isDirtyInvalid('supportPhone')"
                autocomplete="tel"
              />
              <p *ngIf="isDirtyInvalid('supportPhone')" class="field-error" role="alert">
                {{ firstError('supportPhone') }}
              </p>
            </div>
          </div>

          <!-- Headquarters Address -->
          <div class="field">
            <label for="headquartersAddress">Headquarters Address <span aria-hidden="true">*</span></label>
            <input
              id="headquartersAddress"
              type="text"
              formControlName="headquartersAddress"
              placeholder="123 Main St, City, Country"
              [class.input--invalid]="isDirtyInvalid('headquartersAddress')"
              autocomplete="street-address"
            />
            <p *ngIf="isDirtyInvalid('headquartersAddress')" class="field-error" role="alert">
              {{ firstError('headquartersAddress') }}
            </p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-submit"
            [disabled]="loading"
            [attr.aria-busy]="loading"
          >
            <ng-container *ngIf="!loading">Continue</ng-container>
            <ng-container *ngIf="loading">
              <span class="material-symbols-outlined spin" aria-hidden="true">refresh</span>
              Processing…
            </ng-container>
          </button>

        </form>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────────── */
    .page-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 2rem 1rem;
    }

    :host-context(.dark) .page-shell {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .card {
      width: 100%;
      max-width: 560px;
      background: #fff;
      border-radius: 1.25rem;
      box-shadow: 0 20px 40px rgba(0,0,0,.08);
      border: 1px solid #e2e8f0;
      padding: 2.5rem;
    }

    :host-context(.dark) .card {
      background: #1e293b;
      border-color: #334155;
      box-shadow: 0 20px 40px rgba(0,0,0,.4);
    }

    /* ── Header ──────────────────────────────────────────────── */
    .card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 2rem;
    }

    .icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    :host-context(.dark) .icon-wrap { background: #1e3a5f; }

    .icon-wrap .material-symbols-outlined {
      font-size: 28px;
      color: #3b82f6;
    }

    .card-header h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 .4rem;
      letter-spacing: -.025em;
    }

    :host-context(.dark) .card-header h1 { color: #f1f5f9; }

    .card-header p {
      font-size: .875rem;
      color: #64748b;
      margin: 0;
    }

    /* ── Banners ─────────────────────────────────────────────── */
    .banner {
      display: flex;
      align-items: flex-start;
      gap: .625rem;
      border-radius: .75rem;
      padding: .875rem 1rem;
      font-size: .875rem;
      margin-bottom: 1.25rem;
    }

    .banner--success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .banner--error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    :host-context(.dark) .banner--success {
      background: #052e16;
      color: #4ade80;
      border-color: #166534;
    }

    :host-context(.dark) .banner--error {
      background: #2d0b0b;
      color: #f87171;
      border-color: #7f1d1d;
    }

    .banner .material-symbols-outlined { font-size: 18px; flex-shrink: 0; margin-top: 1px; }

    .banner-list {
      margin: .5rem 0 0 1rem;
      padding: 0;
    }

    /* ── Form ────────────────────────────────────────────────── */
    .form-body {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: .375rem;
      flex: 1;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    @media (max-width: 480px) {
      .field-row { grid-template-columns: 1fr; }
    }

    label {
      font-size: .875rem;
      font-weight: 600;
      color: #374151;
    }

    :host-context(.dark) label { color: #cbd5e1; }

    label span { color: #ef4444; margin-left: 2px; }

    input, textarea {
      width: 100%;
      border-radius: .625rem;
      border: 1.5px solid #d1d5db;
      background: #f9fafb;
      padding: .6rem .875rem;
      font-size: .9375rem;
      color: #111827;
      transition: border-color .15s, box-shadow .15s;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
      font-family: inherit;
    }

    :host-context(.dark) input,
    :host-context(.dark) textarea {
      background: #0f172a;
      border-color: #475569;
      color: #f1f5f9;
    }

    input:focus, textarea:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,.15);
    }

    .input--invalid {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,.1) !important;
    }

    .field-error {
      font-size: .75rem;
      color: #dc2626;
      margin: 0;
    }

    :host-context(.dark) .field-error { color: #f87171; }

    /* ── Submit button ───────────────────────────────────────── */
    .btn-submit {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      background: #3b82f6;
      color: #fff;
      font-weight: 700;
      font-size: 1rem;
      padding: .8125rem 1rem;
      border-radius: .75rem;
      border: none;
      cursor: pointer;
      transition: background .2s, transform .1s, box-shadow .2s;
      box-shadow: 0 4px 14px rgba(59,130,246,.35);
      margin-top: .25rem;
    }

    .btn-submit:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(59,130,246,.4);
    }

    .btn-submit:active:not(:disabled) { transform: translateY(0); }

    .btn-submit:disabled {
      opacity: .55;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* ── Spinner ─────────────────────────────────────────────── */
    .spin {
      animation: spin .75s linear infinite;
      font-size: 18px;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `],
})
export class CompanySetupComponent {
  private fb = inject(FormBuilder);
  private onboardingApi = inject(OnboardingService);
  private router = inject(Router);

  loading = false;
  error: string | null = null;
  errorDetails: string[] = [];
  successMessage: string | null = null;

  // Error message map – one place to change copy
  private readonly errorMessages: Record<string, Record<string, string>> = {
    organizationName: { required: 'Organization name is required.' },
    corporateWebsite: {
      required: 'Corporate website is required.',
      url: 'Enter a valid website URL (e.g. https://yourcompany.com).',
    },
    primaryLanguage: { required: 'Primary language is required.' },
    description: { required: 'Description is required.' },
    supportEmail: {
      required: 'Support email is required.',
      email: 'Enter a valid email address.',
    },
    supportPhone: {
      required: 'Support phone is required.',
      phone: 'Enter a valid phone number (e.g. +1 555-123-4567).',
    },
    headquartersAddress: { required: 'Headquarters address is required.' },
  };

  form = this.fb.nonNullable.group({
    organizationName: ['', [Validators.required]],
    corporateWebsite: ['', [Validators.required, urlValidator]],
    primaryLanguage: ['', [Validators.required]],
    description: ['', [Validators.required]],
    supportEmail: ['', [Validators.required, Validators.email]],
    supportPhone: ['', [Validators.required, phoneValidator]],
    headquartersAddress: ['', [Validators.required]],
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** True when a control has been touched/dirty AND is invalid */
  isDirtyInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /** Returns the first human-readable error for a control */
  firstError(name: string): string {
    const ctrl = this.form.get(name);
    if (!ctrl?.errors) return '';
    const firstKey = Object.keys(ctrl.errors)[0];
    return this.errorMessages[name]?.[firstKey] ?? `Invalid value (${firstKey}).`;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  submit(): void {
    // Show all errors if the user submits without touching fields
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.errorDetails = [];
    this.successMessage = null;

    this.onboardingApi.apiOnboardingCompanyProfilePut(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Company profile saved!';
        // Short delay so the user sees the success message before navigating
        setTimeout(() => this.router.navigate(['/onboarding/service-rates']), 800);
      },
      error: (err) => {
        this.loading = false;
        const body = err?.error;
        if (body?.details && Array.isArray(body.details)) {
          this.error = 'Please correct the following:';
          this.errorDetails = body.details;
        } else {
          this.error = body?.message ?? 'Failed to save company profile. Please try again.';
        }
      },
    });
  }
}