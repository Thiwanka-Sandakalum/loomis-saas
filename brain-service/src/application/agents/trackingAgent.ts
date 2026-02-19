import { LlmAgent } from '@google/adk';
import { trackingTool } from '../../tools/trackingTool.js';

export const trackingAgent = new LlmAgent({
    name: 'tracking_agent',
    model: 'gemini-2.5-flash',
    description: 'Specializes in shipment tracking and status history.',
    instruction: `You are the Tracking Agent for Courier Service.
Your specialized goal is to help users track their shipments using 'track_shipment'.
You can provide the current status and, if asked, detailed history of the shipment locations and status changes.`,
    tools: [trackingTool],
});
