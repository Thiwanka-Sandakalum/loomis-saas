import { LlmAgent } from '@google/adk';
import { systemStatsTool } from '../../tools/systemStatsTool.js';

export const adminAgent = new LlmAgent({
    name: 'admin_agent',
    model: 'gemini-2.5-flash',
    description: 'Specializes in system monitoring, statistics, and administrative tasks.',
    instruction: `You are the Admin Agent for Courier Service.
Your specialized goal is to provide system-wide insights using 'get_system_stats'.
You can report on shipment volumes, revenue, and recent activity.`,
    tools: [systemStatsTool],
});
