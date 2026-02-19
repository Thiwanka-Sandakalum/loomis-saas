import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { apiClient } from '../infra/api/apiClient.js';

export const systemStatsTool = new FunctionTool({
    name: 'get_system_stats',
    description: 'Retrieves high-level system statistics (shipment counts, complaint status, etc.).',
    parameters: z.object({}),
    execute: async () => {
        try {
            const response = await apiClient.getDashboardOverview();

            if (response.error || response.status !== 200) {
                return {
                    status: 'error',
                    error_message: response.error || 'Failed to retrieve system stats via API'
                };
            }

            const statsData = response.data;

            return {
                status: 'success',
                report: `System statistics retrieved successfully via API.`,
                stats: statsData
            };
        } catch (error: any) {
            return {
                status: 'error',
                error_message: `Failed to retrieve stats: ${error.message}`
            };
        }
    },
});
