import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RatesService } from '../../core/api-client/api/rates.service';
import { OnboardingService } from '../../core/api-client/api/onboarding.service';
import { UpdateRateRequest } from '../../core/api-client/model/updateRateRequest';
import { AuthService } from '../../core/services';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tab { id: string; label: string; }

interface ServiceLevel {
  id: string;
  rateId?: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  baseRate: number;
  perKg: number;
  enabled: boolean;
}

type ServiceLevelField = keyof ServiceLevel;

interface SectionState {
  editing: boolean;
  saving: boolean;
  error: string | null;
  success: boolean;
}

// ─── Icon config ──────────────────────────────────────────────────────────────

const ICON_CONFIG: Record<string, {
  title: string; subtitle: string; icon: string; iconColor: string; iconBg: string;
}> = {
  standard: {
    title: 'Standard Delivery', subtitle: '3–5 business days',
    icon: 'local_shipping', iconColor: 'text-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  express: {
    title: 'Express Delivery', subtitle: '1–2 business days',
    icon: 'rocket_launch', iconColor: 'text-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  overnight: {
    title: 'Overnight', subtitle: 'Next day by 9 AM',
    icon: 'bolt', iconColor: 'text-amber-600', iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-5xl flex flex-col gap-8 pb-12">

      <!-- Page header -->
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Platform Settings</h1>
        <p class="text-slate-500 dark:text-slate-400">Configure operational parameters, rates, and platform branding.</p>
      </div>

      <!-- Tabs -->
      <div class="border-b border-slate-200 dark:border-slate-800">
        <nav class="-mb-px flex gap-8" aria-label="Settings tabs">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="activeTab.set(tab.id)"
              class="whitespace-nowrap py-4 px-1 text-sm font-medium border-b-2 transition-colors"
              [class.border-primary]="activeTab() === tab.id"
              [class.text-primary]="activeTab() === tab.id"
              [class.border-transparent]="activeTab() !== tab.id"
              [class.text-slate-500]="activeTab() !== tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
            >{{ tab.label }}</button>
          }
        </nav>
      </div>

      <!-- ══════════════════════════════════════════════════════
           GENERAL TAB
      ══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'general') {
        <div class="flex flex-col gap-6">

          <!-- ── Company Profile ── -->
          <div class="rounded-xl border bg-white shadow-sm dark:bg-slate-900 transition-all"
               [class.border-slate-200]="!profileState().editing"
               [class.dark:border-slate-800]="!profileState().editing"
               [class.border-primary]="profileState().editing"
               [class.ring-4]="profileState().editing"
               [class.ring-primary/10]="profileState().editing">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Company Profile</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Your organization's public information and contact details.</p>
              </div>
              <div class="flex items-center gap-2">
                @if (!profileState().editing) {
                  <button type="button" (click)="startEdit('profile')" class="btn-edit">
                    <span class="material-symbols-outlined text-[16px]">edit</span>Edit
                  </button>
                } @else {
                  <button type="button" (click)="cancelEdit('profile')" class="btn-cancel">
                    <span class="material-symbols-outlined text-[16px]">close</span>Cancel
                  </button>
                  <button type="button" (click)="saveProfile()" [disabled]="profileState().saving" class="btn-save">
                    <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="profileState().saving">
                      {{ profileState().saving ? 'refresh' : 'save' }}
                    </span>
                    {{ profileState().saving ? 'Saving…' : 'Save' }}
                  </button>
                }
              </div>
            </div>

            <!-- Alerts -->
            @if (profileState().error) {
              <div class="alert alert--error mx-6 mt-4" role="alert">
                <span class="material-symbols-outlined text-[16px]">error</span>{{ profileState().error }}
              </div>
            }
            @if (profileState().success) {
              <div class="alert alert--success mx-6 mt-4" role="status">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>Company profile saved successfully.
              </div>
            }

            <!-- Fields -->
            <div class="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

              <div>
                <label class="field-label">Organization Name</label>
                @if (profileState().editing) {
                  <input type="text" [ngModel]="companyName()" (ngModelChange)="companyName.set($event)"
                    class="field-input" placeholder="e.g. Acme Corp" />
                } @else {
                  <p class="field-value">{{ companyName() || '—' }}</p>
                }
              </div>

              <div>
                <label class="field-label">Corporate Website</label>
                @if (profileState().editing) {
                  <div class="relative">
                    <span class="field-icon material-symbols-outlined">language</span>
                    <input type="url" [ngModel]="companyWebsite()" (ngModelChange)="companyWebsite.set($event)"
                      class="field-input pl-9" placeholder="https://" />
                  </div>
                } @else {
                  <p class="field-value">
                    @if (companyWebsite()) {
                      <a [href]="companyWebsite()" target="_blank" rel="noopener"
                        class="text-primary hover:underline inline-flex items-center gap-1">
                        {{ companyWebsite() }}<span class="material-symbols-outlined text-[13px]">open_in_new</span>
                      </a>
                    } @else { — }
                  </p>
                }
              </div>

              <div class="md:col-span-2">
                <label class="field-label">Company Description</label>
                @if (profileState().editing) {
                  <textarea rows="3" [ngModel]="companyDescription()" (ngModelChange)="companyDescription.set($event)"
                    class="field-input resize-none" placeholder="Brief description…"></textarea>
                } @else {
                  <p class="field-value whitespace-pre-line">{{ companyDescription() || '—' }}</p>
                }
              </div>

              <div>
                <label class="field-label">Support Email</label>
                @if (profileState().editing) {
                  <div class="relative">
                    <span class="field-icon material-symbols-outlined">mail</span>
                    <input type="email" [ngModel]="supportEmail()" (ngModelChange)="supportEmail.set($event)"
                      class="field-input pl-9" placeholder="support@company.com" />
                  </div>
                } @else {
                  <p class="field-value">{{ supportEmail() || '—' }}</p>
                }
              </div>

              <div>
                <label class="field-label">Support Phone</label>
                @if (profileState().editing) {
                  <div class="relative">
                    <span class="field-icon material-symbols-outlined">call</span>
                    <input type="tel" [ngModel]="supportPhone()" (ngModelChange)="supportPhone.set($event)"
                      class="field-input pl-9" placeholder="+1 (555) 000-0000" />
                  </div>
                } @else {
                  <p class="field-value">{{ supportPhone() || '—' }}</p>
                }
              </div>

              <div class="md:col-span-2">
                <label class="field-label">Headquarters Address</label>
                @if (profileState().editing) {
                  <textarea rows="2" [ngModel]="companyAddress()" (ngModelChange)="companyAddress.set($event)"
                    class="field-input resize-none" placeholder="Street, City, State, ZIP"></textarea>
                } @else {
                  <p class="field-value whitespace-pre-line">{{ companyAddress() || '—' }}</p>
                }
              </div>

            </div>
          </div>

          <!-- ── Regional Preferences ── -->
          <div class="rounded-xl border bg-white shadow-sm dark:bg-slate-900 transition-all"
               [class.border-slate-200]="!regionalState().editing"
               [class.dark:border-slate-800]="!regionalState().editing"
               [class.border-primary]="regionalState().editing"
               [class.ring-4]="regionalState().editing"
               [class.ring-primary/10]="regionalState().editing">

            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Regional Preferences</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Default currency, timezone, and language.</p>
              </div>
              <div class="flex items-center gap-2">
                @if (!regionalState().editing) {
                  <button type="button" (click)="startEdit('regional')" class="btn-edit">
                    <span class="material-symbols-outlined text-[16px]">edit</span>Edit
                  </button>
                } @else {
                  <button type="button" (click)="cancelEdit('regional')" class="btn-cancel">
                    <span class="material-symbols-outlined text-[16px]">close</span>Cancel
                  </button>
                  <button type="button" (click)="saveRegional()" [disabled]="regionalState().saving" class="btn-save">
                    <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="regionalState().saving">
                      {{ regionalState().saving ? 'refresh' : 'save' }}
                    </span>
                    {{ regionalState().saving ? 'Saving…' : 'Save' }}
                  </button>
                }
              </div>
            </div>

            @if (regionalState().error) {
              <div class="alert alert--error mx-6 mt-4" role="alert">
                <span class="material-symbols-outlined text-[16px]">error</span>{{ regionalState().error }}
              </div>
            }
            @if (regionalState().success) {
              <div class="alert alert--success mx-6 mt-4" role="status">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>Regional preferences saved.
              </div>
            }

            <div class="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
              <div>
                <label class="field-label">Default Currency</label>
                @if (regionalState().editing) {
                  <select [ngModel]="currency()" (ngModelChange)="currency.set($event)" class="field-input appearance-none">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                } @else {
                  <p class="field-value">{{ currencyLabel() }}</p>
                }
              </div>
              <div>
                <label class="field-label">Timezone</label>
                @if (regionalState().editing) {
                  <select [ngModel]="timezone()" (ngModelChange)="timezone.set($event)" class="field-input appearance-none">
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="UTC">UTC (GMT)</option>
                    <option value="Europe/Paris">Central European Time (CET)</option>
                  </select>
                } @else {
                  <p class="field-value">{{ timezoneLabel() }}</p>
                }
              </div>
              <div>
                <label class="field-label">Language</label>
                @if (regionalState().editing) {
                  <select [ngModel]="language()" (ngModelChange)="language.set($event)" class="field-input appearance-none">
                    <option value="en-US">English (US)</option>
                    <option value="fr-FR">French (FR)</option>
                    <option value="es-ES">Spanish (ES)</option>
                    <option value="de-DE">German (DE)</option>
                  </select>
                } @else {
                  <p class="field-value">{{ languageLabel() }}</p>
                }
              </div>
            </div>
          </div>

        </div>
      }

      <!-- ══════════════════════════════════════════════════════
           RATES & SERVICES TAB
      ══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'rates_services') {
        <div class="flex flex-col gap-6">

          <div class="rounded-xl border bg-white shadow-sm dark:bg-slate-900 transition-all"
               [class.border-slate-200]="!ratesState().editing"
               [class.dark:border-slate-800]="!ratesState().editing"
               [class.border-primary]="ratesState().editing"
               [class.ring-4]="ratesState().editing"
               [class.ring-primary/10]="ratesState().editing">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Service Levels & Pricing</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Base rates and per-kg multipliers for each service tier.</p>
              </div>
              <div class="flex items-center gap-2">
                @if (!ratesState().editing) {
                  <button type="button" (click)="startEdit('rates')" class="btn-edit">
                    <span class="material-symbols-outlined text-[16px]">edit</span>Edit Rates
                  </button>
                } @else {
                  <button type="button" (click)="cancelEdit('rates')" class="btn-cancel">
                    <span class="material-symbols-outlined text-[16px]">close</span>Cancel
                  </button>
                  <button type="button" (click)="saveRates()" [disabled]="ratesState().saving" class="btn-save">
                    <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="ratesState().saving">
                      {{ ratesState().saving ? 'refresh' : 'save' }}
                    </span>
                    {{ ratesState().saving ? 'Saving…' : 'Save Rates' }}
                  </button>
                }
              </div>
            </div>

            @if (ratesState().error) {
              <div class="alert alert--error mx-6 mt-4" role="alert">
                <span class="material-symbols-outlined text-[16px]">error</span>{{ ratesState().error }}
              </div>
            }
            @if (ratesState().success) {
              <div class="alert alert--success mx-6 mt-4" role="status">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>Service rates saved successfully.
              </div>
            }

            @if (isRatesLoading()) {
              <div class="m-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                Loading service rates…
              </div>
            } @else {

              <div class="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                @for (service of serviceLevels(); track service.id) {
                  <div class="flex items-center justify-between px-6 py-4 transition-opacity"
                       [class.opacity-40]="!service.enabled && !ratesState().editing">

                    <!-- Icon + title -->
                    <div class="flex items-center gap-4 min-w-0">
                      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                           [ngClass]="[service.iconBg, service.iconColor]">
                        <span class="material-symbols-outlined">{{ service.icon }}</span>
                      </div>
                      <div class="min-w-0">
                        <h3 class="font-medium text-slate-900 dark:text-white">{{ service.title }}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">{{ service.subtitle }}</p>
                      </div>
                    </div>

                    <!-- Read-only values -->
                    @if (!ratesState().editing) {
                      <div class="flex items-center gap-8 shrink-0">
                        <div class="text-right">
                          <p class="text-xs text-slate-400 dark:text-slate-500">Base Rate</p>
                          <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ service.baseRate | number:'1.2-2' }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-xs text-slate-400 dark:text-slate-500">Per Kg</p>
                          <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ service.perKg | number:'1.2-2' }}</p>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="inline-flex h-5 w-5 items-center justify-center rounded-full"
                                [class.bg-green-100]="service.enabled" [class.dark:bg-green-900/40]="service.enabled"
                                [class.bg-slate-100]="!service.enabled" [class.dark:bg-slate-800]="!service.enabled">
                            <span class="material-symbols-outlined text-[13px]"
                                  [class.text-green-600]="service.enabled" [class.text-slate-400]="!service.enabled">
                              {{ service.enabled ? 'check' : 'close' }}
                            </span>
                          </span>
                          <span class="text-xs text-slate-500 dark:text-slate-400">{{ service.enabled ? 'Active' : 'Inactive' }}</span>
                        </div>
                      </div>
                    }

                    <!-- Edit controls -->
                    @if (ratesState().editing) {
                      <div class="flex items-center gap-4 shrink-0">
                        <div class="flex flex-col gap-1">
                          <label class="text-xs font-medium text-slate-400">Base Rate ($)</label>
                          <input type="number" min="0" step="0.01"
                            [ngModel]="service.baseRate"
                            (ngModelChange)="updateServiceField(service.id, 'baseRate', $event)"
                            class="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </div>
                        <div class="flex flex-col gap-1">
                          <label class="text-xs font-medium text-slate-400">Per Kg ($)</label>
                          <input type="number" min="0" step="0.01"
                            [ngModel]="service.perKg"
                            (ngModelChange)="updateServiceField(service.id, 'perKg', $event)"
                            class="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </div>
                        <div class="flex flex-col items-center gap-1">
                          <label class="text-xs font-medium text-slate-400">Active</label>
                          <label class="relative inline-flex cursor-pointer items-center">
                            <input type="checkbox" class="peer sr-only"
                              [ngModel]="service.enabled"
                              (ngModelChange)="updateServiceField(service.id, 'enabled', $event)" />
                            <div class="h-6 w-11 rounded-full bg-slate-200 transition-colors
                              peer-checked:bg-primary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:bg-slate-700
                              after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full
                              after:border after:border-gray-300 after:bg-white after:transition-all after:content-['']
                              peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                          </label>
                        </div>
                      </div>
                    }

                  </div>
                }
              </div>

            }
          </div>

        </div>
      }

      <!-- Fallback -->
      @if (activeTab() !== 'general' && activeTab() !== 'rates_services') {
        <div class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <span class="material-symbols-outlined text-3xl text-slate-400">construction</span>
          </div>
          <h3 class="text-lg font-medium text-slate-900 dark:text-white">Under Construction</h3>
          <p class="mt-1 text-slate-500 dark:text-slate-400">This section is being updated.</p>
        </div>
      }

    </div>
  `,
  styles: [`
    /* ── Shared field styles ─────────────────────────────────── */
    .field-label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }
    :host-context(.dark) .field-label { color: #94a3b8; }

    .field-input {
      width: 100%;
      border-radius: 0.5rem;
      border: 1.5px solid #d1d5db;
      background: #f9fafb;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      color: #111827;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
      box-sizing: border-box;
    }
    .field-input:focus {
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }
    :host-context(.dark) .field-input {
      background: #0f172a;
      border-color: #475569;
      color: #f1f5f9;
    }
    .field-input.pl-9 { padding-left: 2.25rem; }

    .field-icon {
      position: absolute;
      left: 0.6875rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: #94a3b8;
      pointer-events: none;
    }

    .field-value {
      font-size: 0.9375rem;
      color: #374151;
      padding: 0.375rem 0;
      margin: 0;
      min-height: 1.75rem;
      border-bottom: 1.5px solid #f1f5f9;
    }
    :host-context(.dark) .field-value { color: #cbd5e1; border-bottom-color: #1e293b; }

    /* ── Button variants ─────────────────────────────────────── */
    .btn-edit {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      background: #fff;
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-edit:hover { background: #f8fafc; }
    :host-context(.dark) .btn-edit {
      background: #1e293b; border-color: #334155; color: #cbd5e1;
    }
    :host-context(.dark) .btn-edit:hover { background: #334155; }

    .btn-cancel {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      background: #fff;
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-cancel:hover { background: #f8fafc; }
    :host-context(.dark) .btn-cancel {
      background: #1e293b; border-color: #334155; color: #94a3b8;
    }
    :host-context(.dark) .btn-cancel:hover { background: #334155; }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      border-radius: 0.5rem;
      border: none;
      background: var(--color-primary, #3b82f6);
      padding: 0.375rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(59,130,246,0.3);
      transition: background 0.15s, opacity 0.15s;
    }
    .btn-save:hover { background: #2563eb; }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }

    /* ── Alert banners ───────────────────────────────────────── */
    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      margin-bottom: 0;
    }
    .alert--error {
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: #b91c1c;
    }
    .alert--success {
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      color: #166534;
    }
    :host-context(.dark) .alert--error {
      border-color: #7f1d1d; background: #2d0b0b; color: #f87171;
    }
    :host-context(.dark) .alert--success {
      border-color: #166534; background: #052e16; color: #4ade80;
    }
  `],
})
export default class SettingsComponent implements OnInit {
  private ratesApi = inject(RatesService);
  private onboardingApi = inject(OnboardingService);
  private authService = inject(AuthService);

  // ── Tabs ──────────────────────────────────────────────────────────────────

  activeTab = signal<string>('general');
  tabs: Tab[] = [
    { id: 'general', label: 'General' },
    { id: 'rates_services', label: 'Rates & Services' },
  ];

  // ── Company profile signals ───────────────────────────────────────────────

  companyName = signal('');
  companyDescription = signal('');
  companyWebsite = signal('');
  supportEmail = signal('');
  supportPhone = signal('');
  companyAddress = signal('');

  // ── Regional signals ──────────────────────────────────────────────────────

  currency = signal('USD');
  timezone = signal('America/Los_Angeles');
  language = signal('en-US');

  currencyLabel = computed(() => ({ USD: 'USD ($)', EUR: 'EUR (€)', GBP: 'GBP (£)', CAD: 'CAD ($)' }[this.currency()] ?? this.currency()));
  timezoneLabel = computed(() => ({
    'America/Los_Angeles': 'Pacific Time (PT)',
    'America/New_York': 'Eastern Time (ET)',
    'UTC': 'UTC (GMT)',
    'Europe/Paris': 'Central European Time (CET)',
  }[this.timezone()] ?? this.timezone()));
  languageLabel = computed(() => ({ 'en-US': 'English (US)', 'fr-FR': 'French (FR)', 'es-ES': 'Spanish (ES)', 'de-DE': 'German (DE)' }[this.language()] ?? this.language()));

  // ── Section states ────────────────────────────────────────────────────────

  profileState = signal<SectionState>({ editing: false, saving: false, error: null, success: false });
  regionalState = signal<SectionState>({ editing: false, saving: false, error: null, success: false });
  ratesState = signal<SectionState>({ editing: false, saving: false, error: null, success: false });

  // Snapshots for cancel rollback
  private profileSnapshot: Record<string, string> = {};
  private regionalSnapshot: Record<string, string> = {};
  private ratesSnapshot: ServiceLevel[] = [];

  // ── Rates ─────────────────────────────────────────────────────────────────

  serviceLevels = signal<ServiceLevel[]>([]);
  isRatesLoading = signal(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCompanyProfile();
    this.loadRates();
  }

  // ── Edit / Cancel ─────────────────────────────────────────────────────────

  startEdit(section: 'profile' | 'regional' | 'rates'): void {
    if (section === 'profile') {
      this.profileSnapshot = {
        companyName: this.companyName(), companyDescription: this.companyDescription(),
        companyWebsite: this.companyWebsite(), supportEmail: this.supportEmail(),
        supportPhone: this.supportPhone(), companyAddress: this.companyAddress(),
      };
      this.profileState.set({ editing: true, saving: false, error: null, success: false });
    } else if (section === 'regional') {
      this.regionalSnapshot = { currency: this.currency(), timezone: this.timezone(), language: this.language() };
      this.regionalState.set({ editing: true, saving: false, error: null, success: false });
    } else {
      this.ratesSnapshot = this.serviceLevels().map(s => ({ ...s }));
      this.ratesState.set({ editing: true, saving: false, error: null, success: false });
    }
  }

  cancelEdit(section: 'profile' | 'regional' | 'rates'): void {
    if (section === 'profile') {
      this.companyName.set(this.profileSnapshot['companyName'] ?? '');
      this.companyDescription.set(this.profileSnapshot['companyDescription'] ?? '');
      this.companyWebsite.set(this.profileSnapshot['companyWebsite'] ?? '');
      this.supportEmail.set(this.profileSnapshot['supportEmail'] ?? '');
      this.supportPhone.set(this.profileSnapshot['supportPhone'] ?? '');
      this.companyAddress.set(this.profileSnapshot['companyAddress'] ?? '');
      this.profileState.set({ editing: false, saving: false, error: null, success: false });
    } else if (section === 'regional') {
      this.currency.set(this.regionalSnapshot['currency'] ?? 'USD');
      this.timezone.set(this.regionalSnapshot['timezone'] ?? 'America/Los_Angeles');
      this.language.set(this.regionalSnapshot['language'] ?? 'en-US');
      this.regionalState.set({ editing: false, saving: false, error: null, success: false });
    } else {
      this.serviceLevels.set(this.ratesSnapshot);
      this.ratesState.set({ editing: false, saving: false, error: null, success: false });
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  private loadCompanyProfile(): void {
    this.onboardingApi.apiOnboardingStatusGet().subscribe({
      next: (status: any) => {
        const profile = status?.companyProfile ?? {};
        this.companyName.set(profile.organizationName ?? '');
        this.companyDescription.set(profile.description ?? '');
        this.companyWebsite.set(profile.corporateWebsite ?? '');
        this.supportEmail.set(profile.supportEmail ?? '');
        this.supportPhone.set(profile.supportPhone ?? '');
        this.companyAddress.set(profile.headquartersAddress ?? '');
        this.currency.set(profile.primaryLanguage === 'fr-FR' ? 'EUR' : 'USD'); // fallback logic
        this.timezone.set('America/Los_Angeles'); // fallback, as not in API
        this.language.set(profile.primaryLanguage ?? 'en-US');
      },
      error: () => { /* silently fall back to empty fields */ },
    });
  }

  loadRates(): void {
    this.isRatesLoading.set(true);
    this.ratesApi.apiRatesGet().subscribe({
      next: (response) => {
        const mapped = this.mapRates(response);
        this.serviceLevels.set(mapped.length ? mapped : this.defaultRates());
        this.isRatesLoading.set(false);
      },
      error: () => {
        this.serviceLevels.set(this.defaultRates());
        this.isRatesLoading.set(false);
      },
    });
  }

  // ── Save operations ───────────────────────────────────────────────────────

  saveProfile(): void {
    this.profileState.update(s => ({ ...s, saving: true, error: null, success: false }));
    this.onboardingApi.apiOnboardingCompanyProfilePut({
      organizationName: this.companyName(),
      description: this.companyDescription(),
      corporateWebsite: this.companyWebsite(),
      supportEmail: this.supportEmail(),
      supportPhone: this.supportPhone(),
      headquartersAddress: this.companyAddress(),
    }).subscribe({
      next: () => {
        this.profileState.set({ editing: false, saving: false, error: null, success: true });
        setTimeout(() => this.profileState.update(s => ({ ...s, success: false })), 3000);
      },
      error: (err) => {
        this.profileState.update(s => ({
          ...s, saving: false, error: err?.error?.message ?? 'Failed to save. Please try again.',
        }));
      },
    });
  }

  saveRegional(): void {
    this.regionalState.update(s => ({ ...s, saving: true, error: null, success: false }));
    this.onboardingApi.apiOnboardingCompanyProfilePut({
      organizationName: this.companyName(),
      description: this.companyDescription(),
      corporateWebsite: this.companyWebsite(),
      supportEmail: this.supportEmail(),
      supportPhone: this.supportPhone(),
      headquartersAddress: this.companyAddress(),
      primaryLanguage: this.language(),
    }).subscribe({
      next: () => {
        this.regionalState.set({ editing: false, saving: false, error: null, success: true });
        setTimeout(() => this.regionalState.update(s => ({ ...s, success: false })), 3000);
      },
      error: (err) => {
        this.regionalState.update(s => ({
          ...s, saving: false, error: err?.error?.message ?? 'Failed to save. Please try again.',
        }));
      },
    });
  }

  saveRates(): void {
    this.ratesState.update(s => ({ ...s, saving: true, error: null, success: false }));

    const updates = this.serviceLevels()
      .filter(s => !!s.rateId)
      .map(s => this.ratesApi.apiRatesRateIdPatch(s.rateId!, {
        baseRate: s.baseRate, additionalKgRate: s.perKg,
      } as UpdateRateRequest));

    if (!updates.length) {
      this.ratesState.set({ editing: false, saving: false, error: null, success: true });
      setTimeout(() => this.ratesState.update(s => ({ ...s, success: false })), 3000);
      return;
    }

    let completed = 0;
    let hasError = false;
    for (const req of updates) {
      req.subscribe({
        next: () => {
          if (hasError) return;
          if (++completed === updates.length) {
            this.ratesState.set({ editing: false, saving: false, error: null, success: true });
            setTimeout(() => this.ratesState.update(s => ({ ...s, success: false })), 3000);
          }
        },
        error: (err) => {
          if (hasError) return;
          hasError = true;
          this.ratesState.update(s => ({
            ...s, saving: false, error: err?.error?.message ?? 'Failed to save rates. Please try again.',
          }));
        },
      });
    }
  }

  // ── Rate field update ─────────────────────────────────────────────────────

  updateServiceField(id: string, field: ServiceLevelField, value: ServiceLevel[ServiceLevelField]): void {
    this.serviceLevels.update(levels => levels.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  // ── Mapping helpers ───────────────────────────────────────────────────────

  private mapRates(response: unknown): ServiceLevel[] {
    return this.extractArray(response).map(item => this.mapRate(item));
  }

  private mapRate(item: unknown): ServiceLevel {
    const base = this.isRecord(item) ? item : {};
    const serviceType = this.readString(base, ['serviceType', 'type', 'name'], 'standard') ?? 'standard';
    const key = serviceType.toLowerCase();
    const cfg = ICON_CONFIG[key] ?? ICON_CONFIG['standard'];
    return {
      id: key, rateId: this.readString(base, ['id', 'rateId'], undefined),
      ...cfg,
      baseRate: this.readNumber(base, ['baseRate'], 0),
      perKg: this.readNumber(base, ['additionalKgRate', 'perKg', 'additionalPerKg'], 0),
      enabled: this.readBoolean(base, ['enabled', 'isActive'], true),
    };
  }

  private defaultRates(): ServiceLevel[] {
    return Object.entries(ICON_CONFIG).map(([key, cfg]) => ({
      id: key, ...cfg,
      baseRate: key === 'standard' ? 5.00 : key === 'express' ? 12.00 : 25.00,
      perKg: key === 'standard' ? 0.50 : key === 'express' ? 1.20 : 2.50,
      enabled: true,
    }));
  }

  private extractArray(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    if (this.isRecord(response)) {
      const candidate = [response['data'], response['items'], response['results']].find(v => Array.isArray(v));
      return Array.isArray(candidate) ? candidate : [];
    }
    return [];
  }

  private readNumber(src: Record<string, unknown>, keys: string[], fallback: number): number {
    for (const key of keys) {
      const v = src[key];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    }
    return fallback;
  }

  private readString(src: Record<string, unknown>, keys: string[], fallback?: string): string | undefined {
    for (const key of keys) {
      const v = src[key];
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
    return fallback;
  }

  private readBoolean(src: Record<string, unknown>, keys: string[], fallback: boolean): boolean {
    for (const key of keys) {
      const v = src[key];
      if (typeof v === 'boolean') return v;
    }
    return fallback;
  }

  private isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }
}