import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../../../core/api-client/api/onboarding.service';

// ─── Custom Validators ────────────────────────────────────────────────────────

function positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === '') return null; // let required handle empty
  return isFinite(v) && v >= 0 ? null : { positiveNumber: 'Must be a non-negative number.' };
}

function weightRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('minWeight')?.value;
  const max = group.get('maxWeight')?.value;
  if (min == null || max == null || min === '' || max === '') return null;
  return Number(min) < Number(max) ? null : { weightRange: 'Min weight must be less than max weight.' };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-service-rates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-shell">
      <div class="card">

        <!-- Header -->
        <div class="card-header">
          <div class="stepper">
            <span class="step step--done">
              <span class="material-symbols-outlined">check</span>
            </span>
            <span class="step-line"></span>
            <span class="step step--active">2</span>
          </div>
          <div class="icon-wrap">
            <span class="material-symbols-outlined">local_shipping</span>
          </div>
          <h1>Service Rates</h1>
          <p>Define pricing for each service type and region. These rates power customer quotes, shipment creation, and financial reporting across the platform.</p>
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

        <!-- Empty state: only shown when no rates at all (shouldn't normally happen) -->
        <div *ngIf="rates.length === 0" class="empty-state">
          <span class="material-symbols-outlined">price_change</span>
          <p>No service rates yet. Add your first rate below.</p>
        </div>

        <!-- Form -->
        <form [formGroup]="form" novalidate (ngSubmit)="submit()">

          <!-- Rate cards -->
          <div formArrayName="rates" class="rates-list">
            <div
              *ngFor="let rate of rates.controls; let i = index"
              [formGroupName]="i"
              class="rate-card"
              [class.rate-card--disabled]="!rate.get('enabled')?.value"
            >
              <!-- Card top bar -->
              <div class="rate-card-header">
                <div class="rate-card-title">
                  <span class="rate-index">{{ i + 1 }}</span>
                  <span class="rate-label">{{ rate.get('serviceType')?.value || 'New Rate' }}</span>
                  <span *ngIf="isRequiredRate(i)" class="badge-required">
                    <span class="material-symbols-outlined">lock</span> Required
                  </span>
                </div>
                <div class="rate-card-actions">
                  <label class="toggle" [title]="rate.get('enabled')?.value ? 'Disable rate' : 'Enable rate'">
                    <input type="checkbox" formControlName="enabled" />
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-label">{{ rate.get('enabled')?.value ? 'Active' : 'Inactive' }}</span>
                  </label>
                  <button
                    type="button"
                    class="btn-remove"
                    (click)="removeRate(i)"
                    [disabled]="isRequiredRate(i)"
                    [attr.aria-label]="'Remove rate ' + (i + 1)"
                    [title]="isRequiredRate(i) ? 'Required service types cannot be removed' : 'Remove rate'"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <!-- Fields grid -->
              <div class="rate-fields">

                <!-- Service Type -->
                <div class="field field--full">
                  <label [for]="'serviceType_' + i">Service Type <span aria-hidden="true">*</span></label>
                  <div class="input-with-icon">
                    <span class="input-icon material-symbols-outlined">category</span>
                    <input
                      [id]="'serviceType_' + i"
                      type="text"
                      formControlName="serviceType"
                      placeholder="e.g. Express, Standard, Freight"
                      [class.input--invalid]="isDirtyInvalid(rate, 'serviceType')"
                    />
                  </div>
                  <p *ngIf="isDirtyInvalid(rate, 'serviceType')" class="field-error" role="alert">
                    Service type is required.
                  </p>
                </div>

                <!-- Zone / Region -->
                <div class="field">
                  <label [for]="'zone_' + i">Zone / Region <span aria-hidden="true">*</span></label>
                  <div class="input-with-icon">
                    <span class="input-icon material-symbols-outlined">public</span>
                    <input
                      [id]="'zone_' + i"
                      type="text"
                      formControlName="zone"
                      placeholder="e.g. Domestic, EU, Asia"
                      [class.input--invalid]="isDirtyInvalid(rate, 'zone')"
                    />
                  </div>
                  <p *ngIf="isDirtyInvalid(rate, 'zone')" class="field-error" role="alert">
                    Zone is required.
                  </p>
                </div>

                <!-- Base Rate -->
                <div class="field">
                  <label [for]="'baseRate_' + i">Base Rate ($) <span aria-hidden="true">*</span></label>
                  <div class="input-with-icon">
                    <span class="input-icon material-symbols-outlined">payments</span>
                    <input
                      [id]="'baseRate_' + i"
                      type="number"
                      min="0"
                      step="0.01"
                      formControlName="baseRate"
                      placeholder="0.00"
                      [class.input--invalid]="isDirtyInvalid(rate, 'baseRate')"
                    />
                  </div>
                  <p *ngIf="isDirtyInvalid(rate, 'baseRate')" class="field-error" role="alert">
                    {{ getNumberError(rate, 'baseRate') }}
                  </p>
                </div>

                <!-- Additional Per Kg -->
                <div class="field">
                  <label [for]="'additionalPerKg_' + i">Per Kg Rate ($) <span aria-hidden="true">*</span></label>
                  <div class="input-with-icon">
                    <span class="input-icon material-symbols-outlined">scale</span>
                    <input
                      [id]="'additionalPerKg_' + i"
                      type="number"
                      min="0"
                      step="0.01"
                      formControlName="additionalPerKg"
                      placeholder="0.00"
                      [class.input--invalid]="isDirtyInvalid(rate, 'additionalPerKg')"
                    />
                  </div>
                  <p *ngIf="isDirtyInvalid(rate, 'additionalPerKg')" class="field-error" role="alert">
                    {{ getNumberError(rate, 'additionalPerKg') }}
                  </p>
                </div>

                <!-- Weight Min -->
                <div class="field">
                  <label [for]="'minWeight_' + i">Min Weight (kg)</label>
                  <div class="input-with-icon">
                    <span class="input-icon material-symbols-outlined">arrow_downward</span>
                    <input
                      [id]="'minWeight_' + i"
                      type="number"
                      min="0"
                      step="0.1"
                      formControlName="minWeight"
                      placeholder="0"
                      [class.input--invalid]="isDirtyInvalid(rate, 'minWeight')"
                    />
                  </div>
                </div>

                <!-- Weight Max -->
                <div class="field">
                  <label [for]="'maxWeight_' + i">Max Weight (kg)</label>
                  <div class="input-with-icon">
                    <span class="input-icon material-symbols-outlined">arrow_upward</span>
                    <input
                      [id]="'maxWeight_' + i"
                      type="number"
                      min="0"
                      step="0.1"
                      formControlName="maxWeight"
                      placeholder="∞"
                      [class.input--invalid]="isDirtyInvalid(rate, 'maxWeight')"
                    />
                  </div>
                  <p *ngIf="rate.errors?.['weightRange'] && (rate.get('maxWeight')?.dirty || rate.get('maxWeight')?.touched)"
                     class="field-error" role="alert">
                    Min weight must be less than max weight.
                  </p>
                </div>

                <!-- Notes -->
                <div class="field field--full">
                  <label [for]="'notes_' + i">Notes <span class="label-optional">(optional)</span></label>
                  <textarea
                    [id]="'notes_' + i"
                    rows="2"
                    formControlName="notes"
                    placeholder="Any special conditions, surcharges, or exceptions…"
                  ></textarea>
                </div>

              </div>
            </div>
          </div>

          <!-- Add rate button -->
          <button type="button" class="btn-add" (click)="addRate()">
            <span class="material-symbols-outlined">add_circle</span>
            Add Service Rate
          </button>

          <!-- Divider -->
          <div class="divider"></div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-submit"
            [disabled]="loading || rates.length === 0"
            [attr.aria-busy]="loading"
          >
            <ng-container *ngIf="!loading">
              <span class="material-symbols-outlined">rocket_launch</span>
              Finish Onboarding
            </ng-container>
            <ng-container *ngIf="loading">
              <span class="material-symbols-outlined spin" aria-hidden="true">refresh</span>
              Saving…
            </ng-container>
          </button>

          <p *ngIf="rates.length === 0" class="submit-hint">Add at least one service rate to continue.</p>

        </form>
      </div>
    </div>
  `,
  styles: [`
    /* ── Page shell ──────────────────────────────────────────── */
    .page-shell {
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 2.5rem 1rem;
    }

    :host-context(.dark) .page-shell {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    /* ── Card ────────────────────────────────────────────────── */
    .card {
      width: 100%;
      max-width: 680px;
      background: #fff;
      border-radius: 1.25rem;
      box-shadow: 0 20px 48px rgba(0,0,0,.08);
      border: 1px solid #e2e8f0;
      padding: 2.5rem;
    }

    :host-context(.dark) .card {
      background: #1e293b;
      border-color: #334155;
      box-shadow: 0 20px 48px rgba(0,0,0,.4);
    }

    /* ── Stepper ─────────────────────────────────────────────── */
    .stepper {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 1.25rem;
    }

    .step {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .8125rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step--done {
      background: #dcfce7;
      color: #16a34a;
      border: 2px solid #86efac;
    }

    .step--done .material-symbols-outlined { font-size: 16px; }

    .step--active {
      background: #3b82f6;
      color: #fff;
      border: 2px solid #3b82f6;
      box-shadow: 0 0 0 4px rgba(59,130,246,.2);
    }

    .step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      max-width: 40px;
      margin: 0 .375rem;
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
      max-width: 440px;
      line-height: 1.6;
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
    .banner-list { margin: .5rem 0 0 1rem; padding: 0; }

    /* ── Empty state ─────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .625rem;
      padding: 2.5rem 1rem;
      border: 2px dashed #e2e8f0;
      border-radius: 1rem;
      margin-bottom: 1.25rem;
      color: #94a3b8;
      text-align: center;
    }

    :host-context(.dark) .empty-state { border-color: #334155; }

    .empty-state .material-symbols-outlined { font-size: 40px; }
    .empty-state p { margin: 0; font-size: .9375rem; }

    /* ── Rates list ──────────────────────────────────────────── */
    .rates-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    /* ── Rate card ───────────────────────────────────────────── */
    .rate-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 1rem;
      overflow: hidden;
      transition: border-color .2s, opacity .2s;
    }

    :host-context(.dark) .rate-card { border-color: #334155; }

    .rate-card:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,.1);
    }

    .rate-card--disabled {
      opacity: .6;
    }

    .rate-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .75rem 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    :host-context(.dark) .rate-card-header {
      background: #0f172a;
      border-bottom-color: #334155;
    }

    .rate-card-title {
      display: flex;
      align-items: center;
      gap: .625rem;
    }

    .rate-index {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3b82f6;
      color: #fff;
      font-size: .75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .rate-label {
      font-size: .875rem;
      font-weight: 600;
      color: #374151;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host-context(.dark) .rate-label { color: #cbd5e1; }

    .rate-card-actions {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    /* ── Toggle ──────────────────────────────────────────────── */
    .toggle {
      display: flex;
      align-items: center;
      gap: .5rem;
      cursor: pointer;
      user-select: none;
    }

    .toggle input { display: none; }

    .toggle-track {
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: #cbd5e1;
      position: relative;
      transition: background .2s;
      flex-shrink: 0;
    }

    .toggle input:checked + .toggle-track { background: #3b82f6; }

    .toggle-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
      transition: transform .2s;
    }

    .toggle input:checked ~ .toggle-track .toggle-thumb,
    .toggle input:checked + .toggle-track .toggle-thumb {
      transform: translateX(16px);
    }

    .toggle-label {
      font-size: .75rem;
      font-weight: 600;
      color: #64748b;
    }

    .badge-required {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: .6875rem;
      font-weight: 600;
      color: #6366f1;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: .375rem;
      padding: 1px 6px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .badge-required .material-symbols-outlined { font-size: 12px; }

    :host-context(.dark) .badge-required {
      background: #1e1b4b;
      color: #a5b4fc;
      border-color: #3730a3;
    }

    /* ── Remove button ───────────────────────────────────────── */
    .btn-remove {
      background: none;
      border: none;
      cursor: pointer;
      padding: .25rem;
      border-radius: .375rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      transition: color .15s, background .15s;
    }

    .btn-remove:disabled {
      opacity: .3;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn-remove:hover {
      color: #ef4444;
      background: #fef2f2;
    }

    .btn-remove .material-symbols-outlined { font-size: 18px; }

    /* ── Rate fields ─────────────────────────────────────────── */
    .rate-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1.125rem;
    }

    @media (max-width: 520px) {
      .rate-fields { grid-template-columns: 1fr; }
    }

    .field { display: flex; flex-direction: column; gap: .375rem; }
    .field--full { grid-column: 1 / -1; }

    label {
      font-size: .8125rem;
      font-weight: 600;
      color: #374151;
    }

    :host-context(.dark) label { color: #94a3b8; }

    label span { color: #ef4444; margin-left: 2px; }
    .label-optional { color: #94a3b8; font-weight: 400; font-size: .75rem; }

    .input-with-icon {
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: .6875rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: #94a3b8;
      pointer-events: none;
    }

    input, textarea {
      width: 100%;
      border-radius: .5rem;
      border: 1.5px solid #d1d5db;
      background: #f9fafb;
      padding: .5625rem .75rem .5625rem 2.25rem;
      font-size: .875rem;
      color: #111827;
      transition: border-color .15s, box-shadow .15s;
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
    }

    textarea {
      padding-left: .75rem;
      resize: vertical;
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

    /* ── Add rate ────────────────────────────────────────────── */
    .btn-add {
      display: flex;
      align-items: center;
      gap: .5rem;
      width: 100%;
      padding: .75rem 1rem;
      border-radius: .75rem;
      border: 2px dashed #cbd5e1;
      background: transparent;
      color: #64748b;
      font-size: .9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color .2s, color .2s, background .2s;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    :host-context(.dark) .btn-add {
      border-color: #475569;
      color: #94a3b8;
    }

    .btn-add:hover {
      border-color: #3b82f6;
      color: #3b82f6;
      background: #eff6ff;
    }

    :host-context(.dark) .btn-add:hover { background: #1e3a5f; }

    .btn-add .material-symbols-outlined { font-size: 20px; }

    /* ── Divider ─────────────────────────────────────────────── */
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin-bottom: 1.25rem;
    }

    :host-context(.dark) .divider { background: #334155; }

    /* ── Submit ──────────────────────────────────────────────── */
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

    .btn-submit .material-symbols-outlined { font-size: 18px; }

    .submit-hint {
      text-align: center;
      font-size: .8125rem;
      color: #94a3b8;
      margin: .625rem 0 0;
    }

    /* ── Spinner ─────────────────────────────────────────────── */
    .spin { animation: spin .75s linear infinite; }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `],
})
export class ServiceRatesComponent {
  private fb = inject(FormBuilder);
  private onboardingApi = inject(OnboardingService);
  private router = inject(Router);

  loading = false;
  error: string | null = null;
  errorDetails: string[] = [];
  successMessage: string | null = null;

  // All service types the API requires — must always be present
  readonly requiredServiceTypes = ['Standard', 'Express', 'Overnight'] as const;

  form = this.fb.group({
    rates: this.fb.array<FormGroup>(
      this.requiredServiceTypes.map(type => this.buildRateGroup(type))
    ),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  get rates(): FormArray {
    return this.form.get('rates') as FormArray;
  }

  private buildRateGroup(serviceType = ''): FormGroup {
    const isRequired = (this.requiredServiceTypes as readonly string[]).includes(serviceType);
    return this.fb.group(
      {
        // Pre-seeded required types are locked — user cannot rename them
        serviceType: [{ value: serviceType, disabled: isRequired }, isRequired ? [] : [Validators.required]],
        zone: ['', [Validators.required]],
        baseRate: [null as number | null, [Validators.required, positiveNumberValidator]],
        additionalPerKg: [null as number | null, [Validators.required, positiveNumberValidator]],
        minWeight: [null as number | null, [positiveNumberValidator]],
        maxWeight: [null as number | null, [positiveNumberValidator]],
        notes: [''],
        enabled: [true],
      },
      { validators: weightRangeValidator }
    );
  }

  isDirtyInvalid(group: AbstractControl, field: string): boolean {
    const ctrl = group.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  getNumberError(group: AbstractControl, field: string): string {
    const ctrl = group.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'This field is required.';
    if (ctrl.errors['positiveNumber']) return ctrl.errors['positiveNumber'];
    return 'Invalid value.';
  }

  // ── Rate management ───────────────────────────────────────────────────────

  isRequiredRate(index: number): boolean {
    return index < this.requiredServiceTypes.length;
  }

  addRate(): void {
    this.rates.push(this.buildRateGroup());
  }

  removeRate(index: number): void {
    if (this.isRequiredRate(index)) return; // never remove required types
    this.rates.removeAt(index);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.rates.length === 0) {
      this.error = 'Please add at least one service rate.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.errorDetails = [];
    this.successMessage = null;

    this.onboardingApi.apiOnboardingRatesPost({ rates: this.form.getRawValue().rates }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Service rates saved!';
        setTimeout(() => this.router.navigate(['/dashboard']), 800);
      },
      error: (err) => {
        this.loading = false;
        const body = err?.error;
        if (body?.details && Array.isArray(body.details)) {
          this.error = 'Please correct the following:';
          this.errorDetails = body.details;
        } else {
          this.error = body?.message ?? 'Failed to save service rates. Please try again.';
        }
      },
    });
  }
}