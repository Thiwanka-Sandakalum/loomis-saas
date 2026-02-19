import { LlmAgent } from '@google/adk';
import { paymentTool } from '../../tools/paymentTool.js';

export const financeAgent = new LlmAgent({
    name: 'finance_records_agent',
    model: 'gemini-2.5-flash',
    description: 'Handles payments and financial records.',
    instruction: `You are the Finance & Records Agent for Courier Service.
Your specialized goal is to process payments for shipments using 'process_payment'.
You will collect the tracking number, amount, and payment method to process a payment and provide a receipt ID.`,
    tools: [paymentTool],
});
