import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { apiClient } from '../infra/api/apiClient.js';

export const complaintTool = new FunctionTool({
    name: 'create_complaint',
    description: 'Logs a customer complaint associated with a tracking number.',
    parameters: z.object({
        tracking_number: z.string().describe('The tracking number the complaint is related to.'),
        complaint_type: z.string().describe('The type of complaint (e.g., Delay, Damage, Lost).'),
        description: z.string().describe('A detailed description of the complaint.'),
        customer_contact: z.string().optional().describe('Customer contact (email or phone).'),
    }),
    execute: async ({ tracking_number, complaint_type, description, customer_contact }) => {
        try {
            const payload = {
                trackingNumber: tracking_number,
                description,
                type: complaint_type,
                customerContact: customer_contact || 'Not provided',
            };

            const response = await apiClient.fileComplaint(payload);

            if (response.error || response.status !== 200) {
                return {
                    status: 'error',
                    error_message: response.error || `Cannot log complaint: Failed to create complaint via API`
                };
            }

            return {
                status: 'success',
                report: `Complaint logged successfully for tracking number ${tracking_number} via API.`
            };
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to log complaint: ${error.message}`
            };
        }
    },
});
