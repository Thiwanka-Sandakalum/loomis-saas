import { Component, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';


import { InquiryService } from '../../core/services/inquiry.service';
import { Inquiry } from '../../core/models/inquiry.model';


// Local type definition for InquiryMessage (matches expected usage in this component)
type InquiryMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string | Date;
};

@Component({
  selector: 'app-inquiry-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
      <div class="max-w-4xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex items-center gap-4 mb-4">
           <button (click)="goBack()" class="flex h-10 w-10 min-w-[2.5rem] items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors shadow-sm">
              <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                Inquiry Log: Sarah Jenkins
                 <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  #719283
                </span>
              </h1>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Audit trail of all communications</p>
            </div>
        </div>

        <!-- Audit Log Container -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          <!-- Log Header -->
          <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Activity History</h2>
            <div class="flex gap-2">
                 <button class="text-xs font-medium text-primary hover:underline">Export Log</button>
            </div>
          </div>

          <!-- Log Entries -->
          <div class="max-h-[calc(100vh-250px)] overflow-y-auto">
            @for (msg of messages(); track msg.id) {
              <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group last:border-0">
                <div class="flex items-start gap-4">
                  
                  <!-- Timestamp Column -->
                  <div class="w-24 flex-shrink-0 pt-1">
                    <span class="text-xs font-mono text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {{ msg.timestamp }}
                    </span>
                  </div>

                  <!-- Icon/Actor Column -->
                  <div class="flex-shrink-0">
                     @if (msg.direction === 'inbound') {
                        <div class="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                          <span class="material-symbols-outlined text-[18px]">person</span>
                        </div>
                      } @else {
                        <div class="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                          <span class="material-symbols-outlined text-[18px]">smart_toy</span>
                        </div>
                      }
                  </div>

                  <!-- Content Column -->
                  <div class="flex-1 min-w-0 pt-0.5">
                    <div class="flex items-baseline gap-2 mb-1">
                      <span class="text-sm font-semibold" 
                        [ngClass]="{
                          'text-blue-700 dark:text-blue-400': msg.direction === 'inbound',
                          'text-purple-700 dark:text-purple-400': msg.direction === 'outbound'
                        }">
                        {{ msg.direction === 'inbound' ? inquiry()?.customerName : 'Loomis AI Agent' }}
                      </span>
                      <span class="text-xs text-slate-400 dark:text-slate-500 ml-auto hidden group-hover:inline-block">ID: {{msg.id}}</span>
                    </div>
                    
                    <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                      {{ msg.text }}
                    </p>
                  </div>

                </div>
              </div>
            }
          </div>
          
        </div>
      </div>
  `
})

export default class InquiryDetailComponent {
  private location = inject(Location);
  private inquiryService = inject(InquiryService);

  inquiry = signal<Inquiry | null>(null);
  messages = computed<InquiryMessage[]>(() =>
    (this.inquiry()?.messages ?? []).map((msg: any) => ({
      id: msg.id,
      direction: msg.direction ?? 'inbound',
      text: msg.text ?? '',
      timestamp: msg.timestamp ?? ''
    }))
  );

  constructor() {
    // In a real app, get the inquiry ID from the route params
    const inquiryId = '1'; // TODO: Replace with actual route param
    this.inquiryService.getInquiryById(inquiryId).subscribe({
      next: (inq) => this.inquiry.set(inq),
      error: () => this.inquiry.set(null)
    });
  }

  goBack() {
    this.location.back();
  }
}
