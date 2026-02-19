import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { getDb } from '../infra/db/connection.js';

export const inquiryTool = new FunctionTool({
    name: 'handle_inquiry',
    description: 'Provides information about services, pricing, courier rates, and delivery schedules.',
    parameters: z.object({
        topic: z.enum(['Services', 'Pricing', 'Schedules', 'Rates']).describe('The topic of the inquiry.'),
    }),
    execute: async ({ topic }) => {
        try {
            const db = getDb();
            if (topic === 'Rates') {
                const rates = await db.collection('courier_rates').find({}).toArray();
                const report = rates.map((r: any) => `${r.service_type} (${r.weight_range}): Base ${r.base_rate}, Addl ${r.additional_kg}/kg`).join('\n');
                return {
                    status: 'success',
                    report: `Courier Rates:\n${report}`
                };
            } else {
                const info = await db.collection('knowledge_base').findOne({ topic });
                if (!info) {
                    return {
                        status: 'error',
                        error_message: `Information about ${topic} is not available.`
                    };
                }
                return {
                    status: 'success',
                    report: info.content
                };
            }
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to handle inquiry: ${error.message}`
            };
        }
    },
});
