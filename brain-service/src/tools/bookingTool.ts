import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { apiClient } from '../infra/api/apiClient.js';

export const bookingTool = new FunctionTool({
    name: 'create_shipment',
    description: 'Creates a new shipment booking with detailed contact and parcel information.',
    parameters: z.object({
        shipment_type: z.enum(['Document', 'Package']).describe('Document (paperwork) or Package (goods).'),

        // Sender info
        sender_name: z.string().describe('Sender full name.'),
        sender_company: z.string().optional().describe('Sender company name (optional).'),
        sender_address1: z.string().describe('Sender address line 1.'),
        sender_address2: z.string().optional().describe('Sender address line 2.'),
        sender_address3: z.string().optional().describe('Sender address line 3.'),
        sender_postal_code: z.string().describe('Sender postal code.'),
        sender_city: z.string().describe('Sender city.'),
        sender_country: z.string().describe('Sender country.'),
        sender_phone: z.string().describe('Sender phone number.'),
        sender_email: z.string().optional().describe('Sender email address.'),
        sender_is_residential: z.boolean().default(false).describe('Is sender address residential?'),
        sender_tax_id: z.string().optional().describe('Sender VAT/TAX ID (optional).'),

        // Receiver info
        receiver_name: z.string().describe('Receiver full name.'),
        receiver_company: z.string().optional().describe('Receiver company name (optional).'),
        receiver_address1: z.string().describe('Receiver address line 1.'),
        receiver_address2: z.string().optional().describe('Receiver address line 2.'),
        receiver_address3: z.string().optional().describe('Receiver address line 3.'),
        receiver_postal_code: z.string().describe('Receiver postal code.'),
        receiver_city: z.string().describe('Receiver city.'),
        receiver_country: z.string().describe('Receiver country.'),
        receiver_phone: z.string().describe('Receiver phone number.'),
        receiver_email: z.string().email().describe('Receiver email address.'),
        receiver_is_residential: z.boolean().default(false).describe('Is receiver address residential?'),
        receiver_tax_id: z.string().optional().describe('Receiver VAT/TAX ID (optional).'),

        // Parcel Attributes
        parcel_weight: z.number().describe('Actual weight of the parcel in kg.'),
        parcel_length: z.number().optional().describe('Length in cm.'),
        parcel_width: z.number().optional().describe('Width in cm.'),
        parcel_height: z.number().optional().describe('Height in cm.'),
        predefined_package: z.enum(['A4 Envelope', 'One or two books', 'Shoe box', 'Moving box']).optional().describe('Predefined package type for standard dimensions.'),

        service_type: z.enum(['Standard', 'Express', 'Overnight']).describe('The type of service.'),
    }),
    execute: async (params) => {
        try {
            const payload = {
                sender: {
                    name: params.sender_name,
                    address: `${params.sender_address1}${params.sender_address2 ? ', ' + params.sender_address2 : ''}${params.sender_address3 ? ', ' + params.sender_address3 : ''}`,
                    city: params.sender_city,
                    country: params.sender_country,
                    phone: params.sender_phone,
                    email: params.sender_email,
                },
                receiver: {
                    name: params.receiver_name,
                    address: `${params.receiver_address1}${params.receiver_address2 ? ', ' + params.receiver_address2 : ''}${params.receiver_address3 ? ', ' + params.receiver_address3 : ''}`,
                    city: params.receiver_city,
                    country: params.receiver_country,
                    phone: params.receiver_phone,
                    email: params.receiver_email,
                },
                parcel: {
                    weight: params.parcel_weight,
                    length: params.parcel_length,
                    width: params.parcel_width,
                    height: params.parcel_height,
                },
                serviceType: params.service_type,
            };

            const response = await apiClient.createShipment(payload);

            if (response.error || response.status !== 200) {
                return {
                    status: 'error',
                    error_message: response.error || 'Failed to create shipment via API'
                };
            }

            const shipmentData = response.data as any;
            const tracking_number = shipmentData.trackingNumber || shipmentData.tracking_number;
            const est_delivery = params.service_type === 'Overnight' ? '1 day' : (params.service_type === 'Express' ? '1-2 days' : '3-5 days');

            return {
                status: 'success',
                report: `Shipment created successfully via API. Tracking Number: ${tracking_number}`,
                tracking_number,
                est_delivery
            };
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to create shipment: ${error.message}`
            };
        }
    },
});
