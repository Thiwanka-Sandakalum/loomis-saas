import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BrainChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AdkPart {
    text?: string;
    /** Gemini may emit "thought" parts — filter these out before showing to the user */
    thought?: boolean;
}

export interface AdkTurn {
    invocationId: string;
    author: string;
    content: {
        parts: AdkPart[];
        role: string;
    };
    timestamp: number;
}

export interface BrainChatResponse {
    response: string;
    sessionId: string;
    timestamp: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class BrainApiService {
    private readonly http = inject(HttpClient);
    private readonly brainApiUrl = environment.brainApiUrl ?? 'http://localhost:8000';
    private readonly appName = 'agent';
    private readonly userId = 'sandbox_user';

    /**
     * In-memory cache of session IDs already created in this page lifecycle.
     * Prevents redundant POST /sessions calls on every message.
     */
    private readonly activeSessions = new Set<string>();

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    /**
     * Send a user message and receive the agent reply as an Observable.
     * Session creation is handled transparently before the /run call.
     */
    chat(message: string, sessionId: string): Observable<BrainChatResponse> {
        return this.ensureSession$(sessionId).pipe(
            switchMap(() =>
                this.http.post<AdkTurn[]>(`${this.brainApiUrl}/run`, {
                    appName: this.appName,
                    userId: this.userId,
                    sessionId,
                    newMessage: { role: 'user', parts: [{ text: message }] },
                }),
            ),
            map(turns => ({
                response: this.extractText(turns),
                sessionId,
                timestamp: new Date().toISOString(),
            })),
            catchError((err: HttpErrorResponse) =>
                throwError(
                    () => new Error(err.error?.message ?? err.statusText ?? 'Agent unavailable'),
                ),
            ),
        );
    }

    /** Returns true if the brain service is reachable and the app is registered. */
    healthCheck(): Observable<boolean> {
        return this.http.get<string[]>(`${this.brainApiUrl}/list-apps`).pipe(
            map(apps => Array.isArray(apps) && apps.includes(this.appName)),
            catchError(() => of(false)),
        );
    }

    /** Generate a unique session ID for a sandbox conversation. */
    generateSessionId(): string {
        return `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    /**
     * Ensures the ADK session exists on the server before issuing a /run.
     * If the session was already created (cached or 400 from server), this
     * completes immediately without an HTTP call.
     */
    private ensureSession$(sessionId: string): Observable<void> {
        if (this.activeSessions.has(sessionId)) {
            return of(void 0);
        }

        const url = `${this.brainApiUrl}/apps/${this.appName}/users/${this.userId}/sessions/${sessionId}`;

        return this.http.post<void>(url, {}).pipe(
            tap(() => this.activeSessions.add(sessionId)),
            map(() => void 0),
            catchError(() => {
                // 400 = already exists on server; any other failure: proceed and let /run surface it
                this.activeSessions.add(sessionId);
                return of(void 0);
            }),
        );
    }

    /**
     * Extracts the final visible text from an ADK /run event array.
     *
     * The /run response contains one turn per agent invocation. When the router
     * delegates to a sub-agent, multiple model turns appear. We take the last
     * model turn that contains non-empty, non-thought text.
     */
    private extractText(turns: AdkTurn[]): string {
        const modelTurns = turns.filter(
            t =>
                t?.content?.role === 'model' &&
                t?.content?.parts?.some(p => p.text && !p.thought && p.text.trim().length > 0),
        );

        const lastTurn = modelTurns.at(-1) ?? turns.at(-1);

        if (!lastTurn?.content?.parts?.length) {
            return 'No response received from the agent.';
        }

        const text = lastTurn.content.parts
            .filter(p => p.text && !p.thought && p.text.trim().length > 0)
            .map(p => p.text!)
            .join('\n');

        return text || 'No response received from the agent.';
    }
}
