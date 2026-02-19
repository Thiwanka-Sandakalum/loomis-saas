import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timer } from 'rxjs';
import { TimeAgoPipe, MarkdownPipe } from '../../shared/pipes';
import { BrainApiService, type BrainChatMessage } from '../../core/services/brain-api.service';

interface TestMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  /** Wall-clock milliseconds from send → first token; only set on AI messages. */
  responseTimeMs?: number;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  initialMessage: string;
}

@Component({
  selector: 'app-ai-agent-sandbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TimeAgoPipe, MarkdownPipe],
  template: `
    <div class="mx-auto w-full max-w-7xl flex flex-col gap-6 h-[calc(100vh-120px)]">
      <!-- Header -->
      <div class="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white">AI Customer Agent Sandbox</h1>
          <p class="text-slate-500 dark:text-slate-400">Test and train your AI customer service agent</p>
        </div>
        <div class="flex gap-2">
          <button
            (click)="clearConversation()"
            class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span class="material-symbols-outlined text-[20px]">delete</span>
            Clear
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
            <span class="material-symbols-outlined text-[20px]">download</span>
            Export Chat
          </button>
        </div>
      </div>

      <div class="flex gap-6 flex-1 overflow-hidden">
        <!-- Chat Area -->
        <div class="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <!-- Agent Status Bar -->
          <div class="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                  <span class="material-symbols-outlined text-white text-[24px]">smart_toy</span>
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-50 dark:border-slate-800 rounded-full"></div>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">AI Agent (Brain Service)</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  @if (isBrainConnected()) {
                    <span class="text-green-600 dark:text-green-400">● Connected</span>
                  } @else {
                    <span class="text-amber-600 dark:text-amber-400">● Mock Mode</span>
                  }
                  • Model: {{ selectedModel }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (brainConnectionError()) {
                <div class="px-3 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg text-xs font-medium">
                  {{ brainConnectionError() }}
                </div>
              }
              <div class="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                Sandbox Mode
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div #messagesContainer class="flex-1 overflow-y-auto p-6 space-y-4">
            @if (messages().length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-center">
                <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <span class="material-symbols-outlined text-slate-400 text-[32px]">chat</span>
                </div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Start a Conversation</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  @if (isBrainConnected()) {
                    <span>Connected to live Brain Service with multi-agent AI</span>
                  } @else {
                    <span>Brain service offline - using mock responses</span>
                  }
                </p>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Try one of the test scenarios or send your own message</p>
              </div>
            } @else {
              @for (message of messages(); track message.id) {
                <div
                  class="flex gap-3"
                  [class.flex-row-reverse]="message.sender === 'user'">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    [class.bg-gradient-to-br]="message.sender === 'ai'"
                    [class.from-primary]="message.sender === 'ai'"
                    [class.to-primary/80]="message.sender === 'ai'"
                    [class.text-white]="message.sender === 'ai'"
                    [class.bg-slate-200]="message.sender === 'user'"
                    [class.dark:bg-slate-700]="message.sender === 'user'"
                    [class.text-slate-600]="message.sender === 'user'"
                    [class.dark:text-slate-300]="message.sender === 'user'">
                    <span class="material-symbols-outlined text-[18px]">
                      {{ message.sender === 'ai' ? 'smart_toy' : 'person' }}
                    </span>
                  </div>
                  <div
                    class="flex flex-col gap-1 max-w-[75%]"
                    [class.items-end]="message.sender === 'user'">
                    <div
                      class="px-4 py-3 rounded-lg"
                      [class.bg-gradient-to-br]="message.sender === 'ai'"
                      [class.from-primary]="message.sender === 'ai'"
                      [class.to-primary/90]="message.sender === 'ai'"
                      [class.text-white]="message.sender === 'ai'"
                      [class.bg-slate-100]="message.sender === 'user'"
                      [class.dark:bg-slate-800]="message.sender === 'user'"
                      [class.text-slate-900]="message.sender === 'user'"
                      [class.dark:text-white]="message.sender === 'user'">
                      @if (message.sender === 'ai') {
                        <div class="text-sm leading-relaxed" [innerHTML]="message.content | markdown"></div>
                      } @else {
                        <p class="text-sm leading-relaxed">{{ message.content }}</p>
                      }
                    </div>
                    <div class="flex items-center gap-2 px-2">
                      <span class="text-xs text-slate-500">
                        {{ message.timestamp | timeAgo }}
                      </span>
                      @if (message.sender === 'ai' && message.responseTimeMs) {
                        <span class="text-xs text-slate-400">· {{ (message.responseTimeMs / 1000).toFixed(1) }}s</span>
                      }
                      @if (message.sender === 'ai') {
                        <button
                          (click)="copyMessage(message.content)"
                          class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Copy">
                          <span class="material-symbols-outlined text-slate-400 text-[14px]">content_copy</span>
                        </button>
                        <button
                          class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Feedback">
                          <span class="material-symbols-outlined text-slate-400 text-[14px]">thumb_up</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
            @if (isTyping()) {
              <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-white text-[18px]">smart_toy</span>
                </div>
                <div class="px-4 py-3 bg-gradient-to-br from-primary to-primary/90 rounded-lg">
                  <div class="flex gap-1">
                    <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Message Input -->
          <div class="border-t border-slate-200 dark:border-slate-800 p-4">
            <div class="flex gap-2">
              <textarea
                [(ngModel)]="userInput"
                (keydown.enter)="onKeyDown($event)"
                placeholder="Type your test message... (Ctrl+Enter to send)"
                rows="3"
                class="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white placeholder-slate-400 resize-none"
              ></textarea>
              <button
                (click)="sendMessage()"
                [disabled]="!userInput.trim() || isTyping()"
                class="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-fit">
                <span class="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Side Panel -->
        <div class="w-80 flex flex-col gap-4 overflow-y-auto">
          <!-- Test Scenarios -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]">science</span>
              Test Scenarios
            </h3>
            <div class="space-y-2">
              @for (scenario of testScenarios; track scenario.id) {
                <button
                  (click)="loadScenario(scenario)"
                  class="w-full text-left p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group">
                  <h4 class="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary mb-1">
                    {{ scenario.name }}
                  </h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {{ scenario.description }}
                  </p>
                </button>
              }
            </div>
          </div>

          <!-- Stats -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]">analytics</span>
              Session Stats
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500 dark:text-slate-400">Messages Sent</span>
                <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ messageCount() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500 dark:text-slate-400">Avg Response Time</span>
                <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ avgResponseTime() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500 dark:text-slate-400">Model</span>
                <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ selectedModel }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export default class AiAgentSandboxComponent implements OnInit {
  // ---------------------------------------------------------------------------
  // Dependency injection (inject() pattern — no constructor params)
  // ---------------------------------------------------------------------------
  private readonly brainApi = inject(BrainApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** Scroll container — kept in sync by the effect() below */
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;

  // ---------------------------------------------------------------------------
  // State signals
  // ---------------------------------------------------------------------------
  messages = signal<TestMessage[]>([]);
  isTyping = signal(false);
  brainConnectionError = signal<string | null>(null);
  userInput = '';
  currentSessionId = this.brainApi.generateSessionId();
  conversationHistory: BrainChatMessage[] = [];
  readonly selectedModel = 'gemini-2.5-flash';

  // ---------------------------------------------------------------------------
  // Reactive / derived signals
  // ---------------------------------------------------------------------------

  /** Live connection status — resolves once on init via healthCheck() Observable */
  isBrainConnected = toSignal(this.brainApi.healthCheck(), { initialValue: false });

  /** Total number of messages (user + AI) in the current session */
  readonly messageCount = computed(() => this.messages().length);

  /** Average AI response time across the current session, or '—' when no data yet */
  readonly avgResponseTime = computed(() => {
    const aiMsgs = this.messages().filter(m => m.sender === 'ai' && m.responseTimeMs != null);
    if (!aiMsgs.length) return '—';
    const avgMs = aiMsgs.reduce((sum, m) => sum + (m.responseTimeMs ?? 0), 0) / aiMsgs.length;
    return `${(avgMs / 1000).toFixed(1)}s`;
  });

  // ---------------------------------------------------------------------------
  // Constructor — effects that need to run throughout the component lifetime
  // ---------------------------------------------------------------------------
  constructor() {
    // Auto-scroll to bottom after Angular renders new messages.
    // queueMicrotask defers the DOM read/write until after the current render cycle.
    effect(() => {
      this.messages(); // track the signal
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    this.addWelcomeMessage();
  }

  // ---------------------------------------------------------------------------
  // User actions
  // ---------------------------------------------------------------------------
  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping()) return;

    this.addUserMessage(text);
    this.userInput = '';
    this.isTyping.set(true);

    const startTime = Date.now();

    this.brainApi
      .chat(text, this.currentSessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const responseTimeMs = Date.now() - startTime;
          this.conversationHistory.push({ role: 'user', content: text });
          this.conversationHistory.push({ role: 'assistant', content: res.response });
          this.addAiMessage(res.response, responseTimeMs);
          this.isTyping.set(false);
        },
        error: () => {
          // Graceful degradation: show a mock reply and surface a transient error badge
          this.addAiMessage(this.generateMockAiResponse(text));
          this.isTyping.set(false);
          this.brainConnectionError.set('Failed to get AI response. Using fallback mode.');
          timer(3000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.brainConnectionError.set(null));
        },
      });
  }

  onKeyDown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.ctrlKey && e.key === 'Enter') this.sendMessage();
  }

  loadScenario(scenario: TestScenario): void {
    this.userInput = scenario.initialMessage;
  }

  clearConversation(): void {
    this.messages.set([]);
    this.conversationHistory = [];
    this.currentSessionId = this.brainApi.generateSessionId();
    this.addWelcomeMessage();
  }

  copyMessage(content: string): void {
    navigator.clipboard.writeText(content).catch(console.error);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  private addWelcomeMessage(): void {
    this.addAiMessage(
      "Hello! I'm your AI customer service assistant powered by **Gemini 2.5 Flash**.\n\nI can help you with **shipping quotes**, **tracking**, **complaints**, and **general inquiries**.\n\nHow can I assist you today?",
    );
  }

  private addUserMessage(content: string): void {
    this.messages.update(msgs => [
      ...msgs,
      { id: `${Date.now()}-user`, sender: 'user', content, timestamp: new Date() },
    ]);
  }

  private addAiMessage(content: string, responseTimeMs?: number): void {
    this.messages.update(msgs => [
      ...msgs,
      { id: `${Date.now()}-ai`, sender: 'ai', content, timestamp: new Date(), responseTimeMs },
    ]);
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ---------------------------------------------------------------------------
  // Test scenario data
  // ---------------------------------------------------------------------------
  readonly testScenarios: TestScenario[] = [
    {
      id: '1',
      name: 'Shipping Quote Request',
      description: 'Customer asks for a shipping quote from New York to Los Angeles',
      initialMessage: 'Hi, I need a quote for shipping a package from New York to Los Angeles. It weighs about 5 lbs.',
    },
    {
      id: '2',
      name: 'Tracking Issue',
      description: 'Customer unable to track their shipment',
      initialMessage: "I can't find my tracking number. My order ID is #12345. Can you help?",
    },
    {
      id: '3',
      name: 'Delivery Delay Complaint',
      description: 'Customer complaining about delayed delivery',
      initialMessage: "My package was supposed to arrive yesterday but it still hasn't shown up. What's going on?",
    },
    {
      id: '4',
      name: 'International Shipping',
      description: 'Questions about international shipping rates and customs',
      initialMessage: 'Do you ship to Germany? What are the rates and how long does it take?',
    },
    {
      id: '5',
      name: 'Damaged Package',
      description: 'Customer received damaged goods',
      initialMessage: 'I just received my order but the box is damaged and one item is broken. What should I do?',
    },
  ];

  // ---------------------------------------------------------------------------
  // Fallback mock responses (used when brain service is unreachable)
  // Strings use the same Markdown subset that MarkdownPipe understands.
  // ---------------------------------------------------------------------------
  private generateMockAiResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase();

    if (lower.includes('quote') || lower.includes('price') || lower.includes('cost')) {
      return (
        "I'd be happy to help with a shipping quote! Here's an estimate:\n\n" +
        '📦 **From:** New York\n' +
        '📍 **To:** Los Angeles\n' +
        '⚖️ **Weight:** 5 lbs (2.27 kg)\n\n' +
        'Estimated rates:\n' +
        '- **Standard** (5-7 days): $15.99\n' +
        '- **Express** (2-3 days): $29.99\n' +
        '- **Overnight**: $49.99\n\n' +
        'Would you like to proceed with one of these options?'
      );
    }

    if (lower.includes('track') || lower.includes('tracking')) {
      return (
        'I found your shipment! Here is the current status:\n\n' +
        '📦 **Status:** In Transit\n' +
        '📍 **Location:** Chicago Distribution Center\n' +
        '🕐 **Last Update:** 2 hours ago\n' +
        '📅 **Expected Delivery:** Tomorrow by 5 PM\n' +
        '🔢 **Tracking #:** LMS-TRK1234567\n\n' +
        'Is there anything else you would like to know?'
      );
    }

    if (lower.includes('delay') || lower.includes('late') || lower.includes("hasn't")) {
      return (
        "I sincerely apologise for the delay. Here's what I found:\n\n" +
        'There was an unexpected hold at our sorting facility due to high volume. ' +
        'Your package is now en route and should arrive **tomorrow afternoon**.\n\n' +
        "As compensation I've applied a **$10 credit** to your account.\n\n" +
        'Would you like me to arrange priority delivery for your next shipment?'
      );
    }

    if (lower.includes('international') || lower.includes('germany') || lower.includes('country')) {
      return (
        'Yes, we ship to **Germany**! Here is what you need to know:\n\n' +
        '- 🌍 **Delivery Time:** 7-14 business days\n' +
        '- 💰 **Starting Rate:** $35 for packages up to 2 lbs\n' +
        '- 📋 **Customs:** We handle all documentation\n' +
        '- 📦 **Tracking:** Available throughout transit\n\n' +
        '*Note: Customs duties and taxes may apply upon arrival in Germany.*\n\n' +
        'Would you like a specific quote for your shipment?'
      );
    }

    if (lower.includes('damage') || lower.includes('broken')) {
      return (
        "I'm very sorry to hear about the damaged package. We will make it right:\n\n" +
        "1. ✅ I'm filing a damage claim immediately\n" +
        '2. 📸 Please take photos of the damage\n' +
        '3. 📦 We can send a replacement via express shipping\n' +
        '4. 💵 Or we can process a **full refund**\n\n' +
        'Which would you prefer? Either way, you do not need to return the damaged item.'
      );
    }

    return (
      "Thank you for your message! I'm here to help with:\n\n" +
      '- Shipping quotes and rates\n' +
      '- Package tracking\n' +
      '- Delivery updates\n' +
      '- International shipping\n' +
      '- Claims and issues\n\n' +
      'Could you provide more details about what you need assistance with?'
    );
  }
}
