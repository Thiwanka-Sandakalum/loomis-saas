import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { apiClient } from '../infra/api/apiClient.js';

export const trackingTool = new FunctionTool({
    name: 'track_shipment',
    description: 'Retrieves the status of a shipment using its tracking number.',
    parameters: z.object({
        tracking_number: z.string().describe('The tracking number of the shipment.'),
    }),
    execute: async ({ tracking_number }) => {
        try {
            const response = await apiClient.trackShipment(tracking_number);

            if (response.error || response.status !== 200) {
                return {
                    status: 'error',
                    error_message: response.error || `Shipment with tracking number ${tracking_number} not found.`
                };
            }

            const shipmentData = response.data;

            return {
                status: 'success',
                report: `Shipment tracking retrieved successfully via API for ${tracking_number}.`,
                shipment: shipmentData
            };
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to retrieve shipment status: ${error.message}`
            };
        }
    },
});
