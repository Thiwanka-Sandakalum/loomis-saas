import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { apiClient } from '../infra/api/apiClient.js';

export const calculateRateTool = new FunctionTool({
    name: 'calculate_shipping_rate',
    description: 'Calculates the estimated shipping cost based on weight, dimensions (volumetric weight), and service type.',
    parameters: z.object({
        actual_weight: z.number().describe('The actual weight of the parcel in kg.'),
        length: z.number().optional().describe('Length in cm.'),
        width: z.number().optional().describe('Width in cm.'),
        height: z.number().optional().describe('Height in cm.'),
        predefined_package: z.enum(['A4 Envelope', 'One or two books', 'Shoe box', 'Moving box']).optional().describe('Predefined package type for standard dimensions.'),
        service_type: z.enum(['Standard', 'Express', 'Overnight']).describe('The type of service.'),
        origin_country: z.string().describe('The country the parcel is being sent from.'),
        destination_country: z.string().describe('The country the parcel is being sent to.'),
    }),
    execute: async ({ actual_weight, length, width, height, predefined_package, service_type, origin_country, destination_country }) => {
        try {
            const payload = {
                weight: actual_weight,
                serviceType: service_type,
                origin: origin_country,
                destination: destination_country,
            };

            const response = await apiClient.inquireRate(payload);

            if (response.error || response.status !== 200) {
                return {
                    status: 'error',
                    error_message: response.error || `Failed to calculate rate for service type ${service_type}`
                };
            }

            const rateData = response.data as any;
            const deliveryEstimate = service_type === 'Overnight' ? '1 day' : (service_type === 'Express' ? '1-2 days' : '3-5 days');

            return {
                status: 'success',
                report: `Shipping estimate retrieved successfully via API for ${service_type} service.`,
                price: rateData.price || rateData.cost,
                currency: rateData.currency || 'USD',
                delivery_estimate: deliveryEstimate,
                rate_data: rateData
            };
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to calculate rate: ${error.message}`
            };
        }
    },
});
