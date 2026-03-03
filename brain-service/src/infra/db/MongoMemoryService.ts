import { Collection, Document, Filter, WithId } from 'mongodb';
import { getDb } from './connection.js';

export interface MemoryEntry {
    sessionId: string;
    userId: string;
    timestamp: Date;
    summary: string;
    data: any;
}

export class MongoMemoryService {
    private collection: Collection<MemoryEntry>;

    constructor() {
        const db = getDb();
        this.collection = db.collection<MemoryEntry>('memories');
    }

    /**
     * Ingest or update session data into long-term memory (upsert)
     */
    async addSessionToMemory(session: any): Promise<void> {
        const entry: MemoryEntry = {
            sessionId: session.id,
            userId: session.userId,
            timestamp: new Date(),
            summary: session.summary || '',
            data: session,
        };
        await this.collection.updateOne(
            { sessionId: session.id },
            { $set: entry },
            { upsert: true }
        );
    }

    /**
     * Search long-term memory for relevant info
     */
    async searchMemory(query: string): Promise<WithId<MemoryEntry>[]> {
        // Simple keyword search in summary and data (customize as needed)
        return this.collection.find({
            $or: [
                { summary: { $regex: query, $options: 'i' } },
                { 'data.events': { $elemMatch: { $text: { $search: query } } } },
            ],
        }).sort({ timestamp: -1 }).limit(10).toArray();
    }
}
