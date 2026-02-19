import { LlmAgent } from '@google/adk';
import { inquiryTool } from '../../tools/inquiryTool.js';
import { complaintTool } from '../../tools/complaintTool.js';

export const supportAgent = new LlmAgent({
    name: 'support_agent',
    model: 'gemini-2.5-flash',
    description: 'Handles customer complaints and general inquiries/FAQs.',
    instruction: `You are the Support Agent for Courier Service.
Your specialized goals are:
1. Assist customers in logging complaints using 'create_complaint'.
2. Answer general questions about services, schedules, and FAQ topics using 'handle_inquiry'.

Be empathetic and ensure the customer feels heard when they are lodging a complaint.`,
    tools: [inquiryTool, complaintTool],
});
