import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { apiClient } from '../infra/api/apiClient.js';

export const paymentTool = new FunctionTool({
    name: 'process_payment',
    description: 'Processes a payment for a shipment and returns a receipt.',
    parameters: z.object({
        tracking_number: z.string().describe('The tracking number the payment is for.'),
        amount: z.number().describe('The payment amount.'),
        method: z.string().describe('The payment method (e.g., Credit Card, PayPal, Cash).'),
    }),
    execute: async ({ tracking_number, amount, method }) => {
        try {
            const payload = {
                trackingNumber: tracking_number,
                amount,
                method,
                transactionId: `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            };

            const response = await apiClient.processPayment(payload);

            if (response.error || response.status !== 200) {
                return {
                    status: 'error',
                    error_message: response.error || `Cannot process payment: Failed via API`
                };
            }

            const paymentData = response.data as any;
            const receipt_id = paymentData.receiptId || paymentData.id || payload.transactionId;

            return {
                status: 'success',
                report: `Payment of ${amount} via ${method} processed successfully for tracking number ${tracking_number} via API. Receipt ID: ${receipt_id}`,
                receipt_id
            };
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to process payment: ${error.message}`
            };
        }
    },
});
