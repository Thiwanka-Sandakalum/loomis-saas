import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
    private authService = inject(AuthService);
    private ws: WebSocket | null = null;

    readonly connected = signal(false);
    readonly messages = signal<any[]>([]);

    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        const apiKey = this.authService.getApiKey();
        if (!apiKey) {
            console.error('Cannot connect to WebSocket: No API key');
            return;
        }

        this.ws = new WebSocket(`${environment.wsUrl}?apiKey=${apiKey}`);

        this.ws.onopen = () => {
            this.connected.set(true);
            console.log('WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.messages.update(msgs => [...msgs, data]);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            this.connected.set(false);
            console.log('WebSocket disconnected');

            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
        };
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected.set(false);
        }
    }

    send(data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not connected');
        }
    }
}
