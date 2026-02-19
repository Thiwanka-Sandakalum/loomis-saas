import axios from 'axios';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5246';
const API_KEY = process.env.CORE_API_KEY || '';

export class MongoSessionService {
    private tenantId: string;
    private apiKey: string;

    constructor(tenantId?: string, apiKey?: string) {
        this.tenantId = tenantId || '';
        this.apiKey = apiKey || API_KEY;
    }

    /**
     * Get session by session ID
     */
    async getSession(sessionId: string): Promise<any | null> {
        try {
            const response = await axios.get(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error('Error getting session:', error.message);
            throw error;
        }
    }

    /**
     * Create new session
     */
    async createSession(userId: string, channel: string = 'api', expiryHours: number = 24): Promise<any> {
        try {
            const response = await axios.post(
                `${CORE_API_URL}/api/sessions`,
                {
                    userId,
                    channel,
                    expiryHours
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

    /**
     * Update session data
     */
    async saveSession(sessionId: string, data: any): Promise<void> {
        try {
            await axios.put(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    data
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (error: any) {
            console.error('Error saving session:', error.message);
            throw error;
        }
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            await axios.delete(
                `${CORE_API_URL}/api/sessions/${sessionId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );
        } catch (error: any) {
            console.error('Error deleting session:', error.message);
            throw error;
        }
    }

    /**
     * Get all sessions for a user
     */
    async getUserSessions(userId: string): Promise<any[]> {
        try {
            const response = await axios.get(
                `${CORE_API_URL}/api/sessions/user/${userId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );
            return response.data.sessions || [];
        } catch (error: any) {
            console.error('Error getting user sessions:', error.message);
            return [];
        }
    }

    /**
     * Extend session expiry
     */
    async extendSession(sessionId: string, hours: number = 24): Promise<void> {
        try {
            await axios.post(
                `${CORE_API_URL}/api/sessions/${sessionId}/extend?hours=${hours}`,
                {},
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );
        } catch (error: any) {
            console.error('Error extending session:', error.message);
            throw error;
        }
    }

    /**
     * Get or create session for user
     */
    async getOrCreateSession(userId: string, channel: string = 'api'): Promise<any> {
        const sessions = await this.getUserSessions(userId);
        const activeSession = sessions.find(s => s.isActive);

        if (activeSession) {
            // Extend session if it's about to expire (less than 1 hour remaining)
            const expiresAt = new Date(activeSession.expiresAt);
            const now = new Date();
            const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (hoursRemaining < 1) {
                await this.extendSession(activeSession.sessionId);
            }

            return activeSession;
        }

        return await this.createSession(userId, channel);
    }
}

// Export singleton instance
export const sessionService = new MongoSessionService();
