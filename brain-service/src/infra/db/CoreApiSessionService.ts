import axios from 'axios';
import { BaseSessionService, Session, CreateSessionRequest, GetSessionRequest, AppendEventRequest, DeleteSessionRequest, ListSessionsRequest, ListSessionsResponse } from '@google/adk';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:5246';
const API_KEY = process.env.CORE_API_KEY || '';

/**
 * ADK-compatible SessionService that uses Core API MongoDB backend
 * This bridges ADK's session interface to our MongoDB-backed Core API
 */
export class CoreApiSessionService extends BaseSessionService {
    private apiKey: string;

    constructor(apiKey?: string) {
        super();
        this.apiKey = apiKey || API_KEY;
    }

    async createSession(request: CreateSessionRequest): Promise<Session> {
        try {
            const response = await axios.post(
                `${CORE_API_URL}/api/sessions`,
                {
                    userId: request.userId,
                    channel: 'api',
                    expiryHours: 720, // 30 days default
                    data: {
                        appName: request.appName,
                        sessionId: request.sessionId,
                        state: request.state || {},
                        events: []
                    }
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Transform Core API response to ADK Session format
            return this.transformToAdkSession(response.data, request);
        } catch (error: any) {
            console.error('Error creating session:', error.message);
            throw error;
        }
    }

    async getSession(request: GetSessionRequest): Promise<Session | undefined> {
        try {
            // Get all user sessions and find the matching one
            const response = await axios.get(
                `${CORE_API_URL}/api/sessions/user/${request.userId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            const sessions = response.data.sessions || [];
            const matchingSession = sessions.find((s: any) =>
                s.id === request.sessionId && s.userId === request.userId
            );

            if (!matchingSession) {
                return undefined;
            }

            // Get full session details
            const sessionResponse = await axios.get(
                `${CORE_API_URL}/api/sessions/${matchingSession.id}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            return this.transformToAdkSession(sessionResponse.data, request);
        } catch (error: any) {
            if (error.response?.status === 404) {
                return undefined;
            }
            console.error('Error getting session:', error.message);
            throw error;
        }
    }

    async listSessions(request: ListSessionsRequest): Promise<ListSessionsResponse> {
        try {
            const response = await axios.get(
                `${CORE_API_URL}/api/sessions/user/${request.userId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            const sessions = response.data.sessions || [];
            const adkSessions = sessions.map((s: any) =>
                this.transformToAdkSession(s, { appName: request.appName, userId: request.userId, sessionId: s.id })
            );

            return { sessions: adkSessions };
        } catch (error: any) {
            console.error('Error listing sessions:', error.message);
            return { sessions: [] };
        }
    }

    async appendEvent(request: AppendEventRequest): Promise<any> {
        try {
            // Get all user sessions to find the matching one
            const sessionResponse = await axios.get(
                `${CORE_API_URL}/api/sessions/user/${request.session.userId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            const sessions = sessionResponse.data.sessions || [];
            const currentSession = sessions.find((s: any) => s.id === request.session.id);

            if (!currentSession) {
                throw new Error(`Session ${request.session.id} not found`);
            }

            // Get full session data
            const fullSession = await axios.get(
                `${CORE_API_URL}/api/sessions/${currentSession.id}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            const sessionData = JSON.parse(fullSession.data.data);
            sessionData.events = sessionData.events || [];
            sessionData.events.push(request.event);

            // Update session with new event
            await axios.put(
                `${CORE_API_URL}/api/sessions/${currentSession.id}`,
                {
                    data: sessionData,
                    extendHours: null
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return request.event; // Return the event as required by ADK
        } catch (error: any) {
            console.error('Error appending event:', error.message);
            throw error;
        }
    }

    async deleteSession(request: DeleteSessionRequest): Promise<void> {
        try {
            // Find session ID by user ID and session ID
            const response = await axios.get(
                `${CORE_API_URL}/api/sessions/user/${request.userId}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            const sessions = response.data.sessions || [];
            const matchingSession = sessions.find((s: any) => s.id === request.sessionId);

            if (matchingSession) {
                await axios.delete(
                    `${CORE_API_URL}/api/sessions/${matchingSession.id}`,
                    {
                        headers: {
                            'X-API-KEY': this.apiKey
                        }
                    }
                );
            }
        } catch (error: any) {
            console.error('Error deleting session:', error.message);
            throw error;
        }
    }

    /**
     * Transform Core API session format to ADK Session format
     */
    private transformToAdkSession(coreSession: any, request: CreateSessionRequest | GetSessionRequest): Session {
        const sessionData = typeof coreSession.data === 'string'
            ? JSON.parse(coreSession.data)
            : coreSession.data;

        return {
            id: coreSession.id,
            appName: sessionData.appName || request.appName,
            userId: coreSession.userId,
            state: sessionData.state || {},
            events: sessionData.events || [],
            lastUpdateTime: new Date(coreSession.updatedAt).getTime()
        };
    }
}
