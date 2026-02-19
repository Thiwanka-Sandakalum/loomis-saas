import 'dotenv/config';
import { initDb } from './infra/db/connection.js';
import { routerAgent } from './application/agents/routerAgent.js';
import { startStatusSimulator } from './jobs/statusUpdater.js';

// Initialize the database and background jobs
initDb();
startStatusSimulator();

// Export agent for ADK API server
export const rootAgent = routerAgent;
