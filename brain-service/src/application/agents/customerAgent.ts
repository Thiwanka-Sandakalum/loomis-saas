import { LlmAgent } from '@google/adk';
import { inquiryTool } from '../../tools/inquiryTool.js';
import { trackingTool } from '../../tools/trackingTool.js';
import { complaintTool } from '../../tools/complaintTool.js';

export const customerAgent = new LlmAgent({
    name: 'customer_experience_agent',
    model: 'gemini-2.5-flash',
    description: 'Handles customer inquiries, tracking, and complaints.',
    instruction: `You are the primary Customer Experience Agent for Courier Service.
Your goals are:
1. Answer general questions about services, pricing, and schedules using 'handle_inquiry'.
2. Help customers track their shipments using 'track_shipment'.
3. Assist customers in logging complaints using 'create_complaint'.

Always be professional and helpful. If a user wants to book a shipment or handle payments, acknowledge their request and inform them you will route them to the specialized agent.`,
    tools: [inquiryTool, trackingTool, complaintTool],
});
