import axios from 'axios';

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
     * Process incoming Telegram message and generate AI response
     */
    async processMessage(chatId: string, text: string, sessionId?: string): Promise<string> {
        try {
            // If no session ID provided, get or create one
            if (!sessionId) {
                const sessionResponse = await this.getOrCreateSession(chatId);
                sessionId = sessionResponse.data?.id || sessionResponse.id || '';
            }

            // Use ADK runner to process message with conversation history
            // For now, we'll use a simple prompt-based approach
            // TODO: Integrate with ADK Runner once session service is fully compatible

            const response = await this.generateAIResponse(text, sessionId || '');

            // Update session with conversation history
            await this.updateSessionHistory(sessionId || '', text, response);

            return response;
        } catch (error: any) {
            console.error('Error processing Telegram message:', error.message);
            return 'Sorry, I encountered an error processing your message. Please try again.';
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
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error creating session:', error.message);
            throw error;
        }
    }

    private async generateAIResponse(userMessage: string, sessionId: string): Promise<string> {
        try {
            // Get session to retrieve conversation history
            const sessionResponse = await axios.get(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    headers: { 'X-API-KEY': this.apiKey }
                }
            );

            const history = sessionResponse.data?.data?.history || [];
            const context = this.buildContextFromHistory(history);

            // Build enriched prompt with context
            let prompt = userMessage;
            if (context) {
                prompt = `Previous conversation:\n${context}\n\nCurrent message: ${userMessage}`;
            }

            // TODO: Integrate with ADK routerAgent here
            // const result = await routerAgent.generate(prompt, { temperature: 0.7, maxTokens: 500 });
            // return result.text;

            // For now, enhanced intent-based responses
            return this.fallbackResponse(userMessage);

        } catch (error: any) {
            console.error('Error generating AI response:', error.message);
            return this.fallbackResponse(userMessage);
        }
    }

    private buildContextFromHistory(history: any[]): string {
        if (history.length === 0) return '';

        // Get last 5 exchanges for context
        const recentHistory = history.slice(-5);
        return recentHistory
            .map((exchange: any) => `User: ${exchange.user}\nAssistant: ${exchange.ai}`)
            .join('\n\n');
    }

    private fallbackResponse(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('track') || lowerMessage.includes('lms-')) {
            return 'To track your shipment, please provide your tracking number (format: LMS-XXXXX). You can also say "track LMS-12345" with your specific tracking number.';
        }

        if (lowerMessage.includes('book') || lowerMessage.includes('ship') || lowerMessage.includes('send')) {
            return 'I can help you book a shipment! Please provide:\n1. Pickup address\n2. Delivery address\n3. Package weight\n4. Service type (Standard/Express/Overnight)';
        }

        if (lowerMessage.includes('rate') || lowerMessage.includes('cost') || lowerMessage.includes('price')) {
            return 'I can calculate shipping rates for you. Please tell me:\n1. From city/country\n2. To city/country\n3. Package weight (kg)\n4. Service type preference';
        }

        if (lowerMessage.includes('complaint') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
            return 'I\'m sorry to hear you\'re experiencing an issue. Please describe your complaint and provide your tracking number if applicable. I\'ll file a complaint and our team will follow up.';
        }

        return 'Hello! I\'m your AI courier assistant. I can help you with:\n• 📦 Tracking shipments\n• 🚚 Booking new deliveries\n• 💰 Calculating rates\n• 🛠️ Filing complaints\n\nHow can I assist you today?';
    }

    private async updateSessionHistory(sessionId: string, userMessage: string, aiResponse: string): Promise<void> {
        try {
            // Get current session
            const session = await axios.get(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            const history = session.data.data?.history || [];
            history.push({
                timestamp: new Date().toISOString(),
                user: userMessage,
                ai: aiResponse
            });

            // Update session with new history
            await axios.put(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    data: {
                        ...session.data.data,
                        history
                    }
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (error: any) {
            console.error('Error updating session history:', error.message);
        }
    }
}
