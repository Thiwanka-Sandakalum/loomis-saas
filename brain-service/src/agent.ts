


import 'dotenv/config';
import { routerAgent } from './application/agents/routerAgent.js';
import { MongoMemoryService } from './infra/db/MongoMemoryService.js';
import { initDb } from './infra/db/connection.js';

let memoryService;
let rootAgent = routerAgent;

/**
 * Call this before using the agent in your server/CLI entrypoint.
 * Ensures MongoDB is initialized and memoryService is ready.
 */
export async function initAgent() {
    await initDb();
    memoryService = new MongoMemoryService();
    return { rootAgent, memoryService };
}

export { rootAgent, memoryService };

