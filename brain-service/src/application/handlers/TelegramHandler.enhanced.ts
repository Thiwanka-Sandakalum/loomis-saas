import axios, { AxiosError } from 'axios';
import { routerAgent } from '../agents/routerAgent.js';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5246';

export interface TelegramHandlerOptions {
    apiKey: string;
}

export class TelegramHandler {
    private apiKey: string;

    constructor(options: TelegramHandlerOptions) {
        this.apiKey = options.apiKey;
    }

    /**
     * Process incoming Telegram message with comprehensive error handling
     */
    async processMessage(chatId: string, text: string, sessionId?: string): Promise<string> {
        try {
            // Validate inputs
            if (!chatId || !text) {
                throw new Error('ChatId and text are required');
            }

            // Get or create session
            if (!sessionId) {
                const sessionResponse = await this.getOrCreateSession(chatId);
                sessionId = sessionResponse.data?.id || sessionResponse.id;
            }

            // Ensure sessionId is defined before proceeding
            if (!sessionId) {
                throw new Error('Failed to obtain session ID');
            }

            // Get conversation history for context
            const history = await this.getSessionHistory(sessionId);
            const context = this.buildContext(history);

            // Generate AI response using ADK
            const response = await this.generateAIResponse(text, context);

            // Update session with conversation history (sessionId is guaranteed to be defined)
            await this.updateSessionHistory(sessionId, text, response);

            return response;

        } catch (error) {
            return this.handleError(error);
        }
    }

    private async getOrCreateSession(chatId: string): Promise<any> {
        try {
            const response = await axios.post(
                `${CORE_API_URL}/api/sessions`,
                {
                    userId: `telegram_${chatId}`,
                    channel: 'telegram',
                    expiryHours: 720, // 30 days
                    data: {}
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );
            return response.data;
        } catch (error) {
            throw this.wrapError(error, 'Failed to create session');
        }
    }

    private async getSessionHistory(sessionId: string): Promise<any[]> {
        try {
            const response = await axios.get(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    headers: { 'X-API-KEY': this.apiKey },
                    timeout: 5000
                }
            );
            return response.data?.data?.history || [];
        } catch (error) {
            console.warn('Failed to load session history:', error);
            return []; // Return empty history on failure
        }
    }

    private buildContext(history: any[]): string {
        if (history.length === 0) return '';

        // Get last 5 exchanges for context
        const recentHistory = history.slice(-5);
        return recentHistory
            .map((exchange: any) => `User: ${exchange.user}\nAssistant: ${exchange.ai}`)
            .join('\n\n');
    }

    private async generateAIResponse(userMessage: string, context: string): Promise<string> {
        try {
            // Build enriched prompt
            let prompt = userMessage;
            if (context) {
                prompt = `Previous conversation:\n${context}\n\nCurrent message: ${userMessage}`;
            }

            // TODO: Integrate with ADK routerAgent
            // const result = await routerAgent.generate(prompt, {
            //     temperature: 0.7,
            //     maxTokens: 500
            // });
            // return result.text;

            // For now, use enhanced fallback
            return this.fallbackResponse(userMessage);

        } catch (error) {
            console.error('AI generation error:', error);
            return this.fallbackResponse(userMessage);
        }
    }

    private fallbackResponse(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('track') || lowerMessage.includes('lms-')) {
            return 'To track your shipment, please provide your tracking number (format: LMS-XXXXX).';
        }

        if (lowerMessage.includes('book') || lowerMessage.includes('ship') || lowerMessage.includes('send')) {
            return 'I can help you book a shipment! Please provide:\n1. Pickup address\n2. Delivery address\n3. Package weight\n4. Service type (Standard/Express/Overnight)';
        }

        if (lowerMessage.includes('rate') || lowerMessage.includes('cost') || lowerMessage.includes('price')) {
            return 'I can calculate shipping rates. Please tell me:\n1. From city/country\n2. To city/country\n3. Package weight (kg)\n4. Service type';
        }

        if (lowerMessage.includes('complaint') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
            return 'I\'m sorry to hear you\'re experiencing an issue. Please describe your complaint and provide your tracking number if applicable.';
        }

        return 'Hello! I\'m your AI courier assistant. I can help you with:\n• 📦 Tracking shipments\n• 🚚 Booking new deliveries\n• 💰 Calculating rates\n• 🛠️ Filing complaints\n\nHow can I assist you today?';
    }

    private async updateSessionHistory(sessionId: string, userMessage: string, aiResponse: string): Promise<void> {
        try {
            // Get current session
            const session = await axios.get(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    headers: { 'X-API-KEY': this.apiKey },
                    timeout: 5000
                }
            );

            const history = session.data.data?.history || [];
            history.push({
                timestamp: new Date().toISOString(),
                user: userMessage,
                ai: aiResponse
            });

            // Keep only last 20 exchanges
            const trimmedHistory = history.slice(-20);

            // Update session
            await axios.put(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    data: {
                        ...session.data.data,
                        history: trimmedHistory
                    }
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );
        } catch (error) {
            // Log but don't fail - history update is not critical
            console.error('Failed to update session history:', error);
        }
    }

    private handleError(error: any): string {
        console.error('TelegramHandler error:', error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNABORTED') {
                return 'Request timeout. Please try again.';
            }

            if (axiosError.response?.status === 401) {
                return 'Authentication failed. Please contact support.';
            }

            if (axiosError.response?.status === 429) {
                return 'Too many requests. Please wait a moment and try again.';
            }

            if (axiosError.response?.status && axiosError.response.status >= 500) {
                return 'Service temporarily unavailable. Please try again later.';
            }
        }

        return 'Sorry, I encountered an error. Please try again or contact support if the issue persists.';
    }

    private wrapError(error: any, message: string): Error {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            return new Error(`${message}: ${axiosError.message}`);
        }
        return new Error(`${message}: ${error.message || 'Unknown error'}`);
    }
}
