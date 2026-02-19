import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { timer } from 'rxjs';
import { IntegrationsService } from '../../core/api-client/api/integrations.service';
import type { TelegramStatusResponse } from '../../core/api-client/model/telegramStatusResponse';

type IntegrationCategory = 'all' | 'notifications' | 'customer-channels' | 'automation';
type ToastType = 'success' | 'error' | 'info';

interface Integration {
  id: string;
  name: string;
  svgIcon: string;
  description: string;
  category: IntegrationCategory;
  enabled: boolean;
  comingSoon?: boolean;
  iconBg: string;
}

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ─── Toast stack (top-right) ─────────────────────────────────────── -->
    <div class="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      @for (t of toasts(); track t.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg shadow-black/10 border text-sm font-medium min-w-[280px] max-w-sm animate-slide-in"
          [class]="t.type === 'success'
            ? 'bg-white dark:bg-slate-900 border-green-200 dark:border-green-800 text-slate-800 dark:text-white'
            : t.type === 'error'
            ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800 text-slate-800 dark:text-white'
            : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-slate-800 dark:text-white'">
          <span class="material-symbols-outlined text-[20px] mt-0.5 shrink-0"
            [class]="t.type === 'success' ? 'text-green-500' : t.type === 'error' ? 'text-red-500' : 'text-blue-500'">
            {{ t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info' }}
          </span>
          <span class="flex-1 leading-snug">{{ t.message }}</span>
          <button (click)="dismissToast(t.id)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      }
    </div>

    <!-- ─── Modal backdrop ──────────────────────────────────────────────── -->
    @if (activeModal()) {
      <div
        class="fixed inset-0 z-40 flex items-center justify-center p-4"
        (click)="closeModal()">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

        <div
          class="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          (click)="$event.stopPropagation()">

          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl"
                [class]="getModalIntegration()?.iconBg">
                <img [src]="getModalIntegration()?.svgIcon" [alt]="getModalIntegration()?.name" class="h-5 w-5 object-contain" />
              </div>
              <div>
                <h2 class="text-sm font-semibold text-slate-900 dark:text-white">
                  Connect {{ getModalIntegration()?.name }}
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Configure your integration settings</p>
              </div>
            </div>
            <button (click)="closeModal()"
              class="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Modal body -->
          <div class="px-6 py-5">

            <!-- ── TELEGRAM form ── -->
            @if (activeModal() === 'telegram') {
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Bot Token <span class="text-red-500">*</span>
                    <input type="password"
                      [value]="telegramBotToken()"
                      (input)="telegramBotToken.set(($any($event.target)).value)"
                      placeholder="123456:ABC-DEF1gHI..."
                      class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </label>
                  <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Bot Username <span class="font-normal text-slate-400">(optional)</span>
                    <input type="text"
                      [value]="telegramBotUsername()"
                      (input)="telegramBotUsername.set(($any($event.target)).value)"
                      placeholder="&#64;your_bot"
                      class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </label>
                </div>
                <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Greeting Message
                  <input type="text"
                    [value]="telegramGreeting()"
                    (input)="telegramGreeting.set(($any($event.target)).value)"
                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                </label>
                <div class="flex flex-wrap gap-5">
                  <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" [checked]="telegramAutoReply()"
                      (change)="telegramAutoReply.set(($any($event.target)).checked)"
                      class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    Enable auto reply
                  </label>
                  <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" [checked]="telegramForwardToBrain()"
                      (change)="telegramForwardToBrain.set(($any($event.target)).checked)"
                      class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    Forward to AI Brain
                  </label>
                </div>
              </div>
            }

            <!-- ── GMAIL form ── -->
            @if (activeModal() === 'gmail') {
              <div class="flex flex-col gap-4">
                <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 flex gap-3 text-xs text-blue-800 dark:text-blue-300">
                  <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                  <span>You'll be redirected to Google to authorise Loomis to send emails on your behalf.</span>
                </div>
                <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sender Display Name
                  <input type="text"
                    [value]="gmailSenderName()"
                    (input)="gmailSenderName.set(($any($event.target)).value)"
                    placeholder="Loomis Notifications"
                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                </label>
                <div class="flex flex-wrap gap-5">
                  @for (evt of gmailEvents; track evt.id) {
                    <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" [checked]="evt.checked"
                        (change)="toggleGmailEvent(evt.id)"
                        class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      {{ evt.label }}
                    </label>
                  }
                </div>
              </div>
            }

            <!-- ── n8n form ── -->
            @if (activeModal() === 'n8n') {
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 gap-3">
                  <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Webhook URL <span class="text-red-500">*</span>
                    <input type="url"
                      [value]="n8nWebhookUrl()"
                      (input)="n8nWebhookUrl.set(($any($event.target)).value)"
                      placeholder="https://your-n8n.com/webhook/loomis"
                      class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </label>
                  <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Auth Secret <span class="font-normal text-slate-400">(optional)</span>
                    <input type="password"
                      [value]="n8nSecret()"
                      (input)="n8nSecret.set(($any($event.target)).value)"
                      placeholder="Bearer token or API key"
                      class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </label>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Trigger on events</p>
                  <div class="flex flex-wrap gap-4">
                    @for (evt of n8nEvents; track evt.id) {
                      <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input type="checkbox" [checked]="evt.checked"
                          (change)="toggleN8nEvent(evt.id)"
                          class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                        {{ evt.label }}
                      </label>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- ── WEBHOOKS form ── -->
            @if (activeModal() === 'webhooks') {
              <div class="flex flex-col gap-4">
                <label class="flex flex-col gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Endpoint URL <span class="text-red-500">*</span>
                  <input type="url"
                    [value]="webhookEndpoint()"
                    (input)="webhookEndpoint.set(($any($event.target)).value)"
                    placeholder="https://yoursite.com/webhooks/loomis"
                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                </label>
                <div>
                  <p class="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Subscribed events</p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (evt of webhookEvents; track evt) {
                      <span class="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">{{ evt }}</span>
                    }
                  </div>
                </div>
              </div>
            }

          </div>

          <!-- Modal footer -->
          <div class="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <button (click)="closeModal()"
              class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button
              (click)="submitModal()"
              [disabled]="modalLoading()"
              class="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 hover:bg-primary/90 disabled:opacity-60 transition-colors">
              @if (modalLoading()) {
                <span class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
              }
              Save &amp; Connect
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── Page ─────────────────────────────────────────────────────────── -->
    <div class="mx-auto w-full max-w-7xl flex flex-col gap-6 pb-24">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Integrations</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connect all your tools to leverage the best performance for your business
        </p>
      </div>

      <!-- Category filter tabs -->
      <div class="flex flex-wrap gap-2">
        @for (cat of categories; track cat.id) {
          <button
            (click)="activeCategory.set(cat.id)"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            [class]="activeCategory() === cat.id
              ? 'bg-primary text-white shadow-sm shadow-primary/30'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50'">
            {{ cat.label }}
          </button>
        }
      </div>

      <!-- Integrations grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (item of filteredIntegrations(); track item.id) {
          <div class="flex flex-col gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm transition-all"
            [class]="item.enabled
              ? 'border-primary/40 shadow-primary/5'
              : 'border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-primary/30'">

            <!-- Card header: icon + toggle/badge -->
            <div class="flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl" [class]="item.iconBg">
                <img [src]="item.svgIcon" [alt]="item.name" class="h-7 w-7 object-contain" />
              </div>

              @if (item.comingSoon) {
                <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Soon
                </span>
              } @else {
                <button
                  (click)="onToggleClick(item)"
                  role="switch"
                  [attr.aria-checked]="item.enabled"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  [class.bg-primary]="item.enabled"
                  [class.bg-slate-200]="!item.enabled"
                  [class.dark:bg-slate-700]="!item.enabled">
                  <span
                    class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200"
                    [class.translate-x-5]="item.enabled"
                    [class.translate-x-0]="!item.enabled">
                  </span>
                </button>
              }
            </div>

            <!-- Name + description + connected badge -->
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-slate-900 dark:text-white">{{ item.name }}</h3>
                @if (item.enabled) {
                  <span class="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                    <span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                    Connected
                  </span>
                }
              </div>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                {{ item.description }}
              </p>
            </div>

            <!-- Configure link (only when enabled) -->
            @if (item.enabled) {
              <button
                (click)="openModal(item.id)"
                class="mt-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <span class="material-symbols-outlined text-[14px]">settings</span>
                Configure
              </button>
            }

          </div>
        }
      </div>

      <!-- API Key / Webhooks panel — always visible -->
      <div class="flex flex-col gap-4">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-primary">vpn_key</span>
          API &amp; Webhooks
        </h2>

        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col gap-6">
          <!-- API Key row -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Production API Key</label>
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-mono text-sm text-slate-600 dark:text-slate-400 truncate">
                cmp_live_o90dz5a7ddd89s7d897s9d87…
              </div>
              <button (click)="copyApiKey()"
                class="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                <span class="material-symbols-outlined text-[15px]">content_copy</span> Copy
              </button>
              <button class="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                <span class="material-symbols-outlined text-[15px]">autorenew</span> Regenerate
              </button>
              <button class="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/30 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap">
                <span class="material-symbols-outlined text-[15px]">delete</span> Revoke
              </button>
            </div>
          </div>

          <!-- Webhooks row -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300">Webhook URL</label>
              <span class="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">check_circle</span> Verified
              </span>
            </div>
            <div class="flex items-center gap-2">
              <input type="url" value="https://yoursite.com/webhooks/loomis" readonly
                class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              <button class="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                <span class="material-symbols-outlined text-[15px]">bolt</span> Test
              </button>
            </div>
            <div class="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Subscribed Events</p>
              <div class="flex flex-wrap gap-1.5">
                @for (evt of webhookEvents; track evt) {
                  <span class="rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{{ evt }}</span>
                }
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button class="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-[17px]">menu_book</span> API Docs
            </button>
            <button class="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-[17px]">science</span> Sandbox
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(1rem); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }
  `],
})
export default class IntegrationsComponent implements OnInit {
  private integrationsApi = inject(IntegrationsService);
  private destroyRef = inject(DestroyRef);

  // ── Toast system ──────────────────────────────────────────────────────────
  toasts = signal<Toast[]>([]);
  private toastCounter = 0;

  showToast(type: ToastType, message: string): void {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, type, message }]);
    timer(4000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dismissToast(id));
  }

  dismissToast(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  // ── Modal system ──────────────────────────────────────────────────────────
  activeModal = signal<string | null>(null);
  modalLoading = signal(false);

  openModal(id: string): void { this.activeModal.set(id); }
  closeModal(): void { this.activeModal.set(null); this.modalLoading.set(false); }

  getModalIntegration() {
    return this.allIntegrations().find(i => i.id === this.activeModal());
  }

  /** Toggle click: if OFF → open config modal; if ON → disconnect immediately */
  onToggleClick(item: Integration): void {
    if (item.enabled) {
      this.disconnectIntegration(item.id);
    } else {
      this.openModal(item.id);
    }
  }

  submitModal(): void {
    const id = this.activeModal();
    if (!id) return;
    if (id === 'telegram') this.connectTelegram();
    else if (id === 'gmail') this.connectGmail();
    else if (id === 'n8n') this.connectN8n();
    else if (id === 'webhooks') this.saveWebhook();
    else {
      // Generic / coming soon path: just enable the card
      this.markEnabled(id, true);
      this.showToast('success', `${this.getModalIntegration()?.name ?? id} connected!`);
      this.closeModal();
    }
  }

  private markEnabled(id: string, enabled: boolean): void {
    this.allIntegrations.update(list =>
      list.map(i => (i.id === id ? { ...i, enabled } : i)),
    );
  }

  private disconnectIntegration(id: string): void {
    const name = this.allIntegrations().find(i => i.id === id)?.name ?? id;
    if (id === 'telegram') {
      this.isTelegramLoading.set(true);
      this.integrationsApi.apiIntegrationsTelegramDisconnectDelete().subscribe({
        next: () => {
          this.markEnabled('telegram', false);
          this.telegramStatus.set({ isConnected: false });
          this.isTelegramLoading.set(false);
          this.showToast('info', 'Telegram disconnected.');
        },
        error: () => {
          this.isTelegramLoading.set(false);
          this.showToast('error', 'Failed to disconnect Telegram.');
        },
      });
    } else {
      this.markEnabled(id, false);
      this.showToast('info', `${name} disconnected.`);
    }
  }

  // ── Category filter ───────────────────────────────────────────────────────
  activeCategory = signal<IntegrationCategory>('all');

  readonly categories: { id: IntegrationCategory; label: string }[] = [
    { id: 'all', label: 'All integrations' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'customer-channels', label: 'Customer Channels' },
    { id: 'automation', label: 'Automation' },
  ];

  // ── Integration data ──────────────────────────────────────────────────────
  private allIntegrations = signal<Integration[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      svgIcon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gmail.svg',
      description: 'Send automated shipment confirmations, delivery updates and alert emails directly through your Gmail account.',
      category: 'notifications',
      enabled: false,
      iconBg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      svgIcon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg',
      description: 'Let customers track shipments, raise complaints and get instant AI-powered support directly inside Telegram.',
      category: 'customer-channels',
      enabled: false,
      iconBg: 'bg-sky-50 dark:bg-sky-900/20',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      svgIcon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg',
      description: 'Handle customer enquiries and send proactive shipment status updates over WhatsApp Business.',
      category: 'customer-channels',
      enabled: false,
      comingSoon: true,
      iconBg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      id: 'messenger',
      name: 'Messenger',
      svgIcon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/messenger.svg',
      description: 'Serve customers via Facebook Messenger with your AI agent handling tracking and support queries automatically.',
      category: 'customer-channels',
      enabled: false,
      comingSoon: true,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      svgIcon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/webhook.svg',
      description: 'Push real-time shipment, payment and complaint events to any endpoint. Integrate with your own systems instantly.',
      category: 'automation',
      enabled: true,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      id: 'n8n',
      name: 'n8n',
      svgIcon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/n8n.svg',
      description: 'Trigger powerful no-code workflows in your n8n instance on any Loomis event — create bookings and more.',
      category: 'automation',
      enabled: false,
      iconBg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ]);

  filteredIntegrations = computed(() => {
    const cat = this.activeCategory();
    const all = this.allIntegrations();
    return cat === 'all' ? all : all.filter(i => i.category === cat);
  });

  // ── Telegram state ────────────────────────────────────────────────────────
  telegramStatus = signal<TelegramStatusResponse | null>(null);
  isTelegramLoading = signal(false);
  telegramBotToken = signal('');
  telegramBotUsername = signal('');
  telegramGreeting = signal('Hello! How can we help?');
  telegramAutoReply = signal(true);
  telegramForwardToBrain = signal(true);

  // ── Gmail state ───────────────────────────────────────────────────────────
  gmailSenderName = signal('Loomis Notifications');
  gmailEvents = [
    { id: 'booking_confirmed', label: 'Booking confirmed', checked: true },
    { id: 'shipment_delivered', label: 'Shipment delivered', checked: true },
    { id: 'payment_received', label: 'Payment received', checked: false },
  ];

  toggleGmailEvent(id: string): void {
    const evt = this.gmailEvents.find(e => e.id === id);
    if (evt) evt.checked = !evt.checked;
  }

  // ── n8n state ─────────────────────────────────────────────────────────────
  n8nWebhookUrl = signal('');
  n8nSecret = signal('');
  n8nEvents = [
    { id: 'shipment_created', label: 'Shipment created', checked: true },
    { id: 'shipment_updated', label: 'Shipment updated', checked: true },
    { id: 'payment_completed', label: 'Payment completed', checked: false },
    { id: 'complaint_raised', label: 'Complaint raised', checked: false },
  ];

  toggleN8nEvent(id: string): void {
    const evt = this.n8nEvents.find(e => e.id === id);
    if (evt) evt.checked = !evt.checked;
  }

  // ── Webhooks state ────────────────────────────────────────────────────────
  webhookEndpoint = signal('https://yoursite.com/webhooks/loomis');
  readonly webhookEvents = ['shipment.created', 'shipment.updated', 'payment.completed'];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTelegramStatus();
  }

  // ── API actions ───────────────────────────────────────────────────────────
  private loadTelegramStatus(): void {
    this.integrationsApi.apiIntegrationsTelegramStatusGet().subscribe({
      next: status => {
        this.telegramStatus.set(status);
        this.telegramBotUsername.set(status.botUsername ?? '');
        if (status.isConnected) this.markEnabled('telegram', true);
      },
      error: () => { /* silent — UI shows disconnected */ },
    });
  }

  connectTelegram(): void {
    if (!this.telegramBotToken().trim()) {
      this.showToast('error', 'Bot token is required.');
      return;
    }
    this.modalLoading.set(true);

    this.integrationsApi.apiIntegrationsTelegramSetupPost({
      botToken: this.telegramBotToken(),
      botUsername: this.telegramBotUsername() || null,
      autoReplyEnabled: this.telegramAutoReply(),
      forwardToBrain: this.telegramForwardToBrain(),
      greetingMessage: this.telegramGreeting(),
    }).subscribe({
      next: () => {
        this.markEnabled('telegram', true);
        this.telegramStatus.set({ isConnected: true, botUsername: this.telegramBotUsername() || undefined });
        this.modalLoading.set(false);
        this.closeModal();
        this.showToast('success', '🎉 Telegram bot connected successfully!');
      },
      error: (err) => {
        this.modalLoading.set(false);
        this.showToast('error', err?.error?.message ?? 'Failed to connect Telegram. Check your bot token.');
      },
    });
  }

  connectGmail(): void {
    this.modalLoading.set(true);
    // Simulate OAuth redirect / API call
    timer(1200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.markEnabled('gmail', true);
      this.modalLoading.set(false);
      this.closeModal();
      this.showToast('success', '✅ Gmail connected! Notification emails are active.');
    });
  }

  connectN8n(): void {
    if (!this.n8nWebhookUrl().trim()) {
      this.showToast('error', 'Webhook URL is required.');
      return;
    }
    this.modalLoading.set(true);
    timer(900).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.markEnabled('n8n', true);
      this.modalLoading.set(false);
      this.closeModal();
      this.showToast('success', '⚡ n8n workflow connected!');
    });
  }

  saveWebhook(): void {
    if (!this.webhookEndpoint().trim()) {
      this.showToast('error', 'Endpoint URL is required.');
      return;
    }
    this.modalLoading.set(true);
    timer(600).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.modalLoading.set(false);
      this.closeModal();
      this.showToast('success', 'Webhook endpoint saved and verified.');
    });
  }

  testTelegramConnection(): void {
    if (!this.telegramBotToken().trim()) {
      this.showToast('error', 'Enter a bot token to test.');
      return;
    }
    this.integrationsApi.apiIntegrationsTelegramTestConnectionPost({ botToken: this.telegramBotToken() }).subscribe({
      next: () => this.showToast('success', 'Telegram connection test passed ✓'),
      error: () => this.showToast('error', 'Telegram test failed. Check your bot token.'),
    });
  }

  copyApiKey(): void {
    navigator.clipboard.writeText('cmp_live_o90dz5a7ddd89s7d897s9d87')
      .then(() => this.showToast('info', 'API key copied to clipboard.'))
      .catch(() => this.showToast('error', 'Could not copy to clipboard.'));
  }
}

