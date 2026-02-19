import { initDb } from './infra/db/connection.js';
import { bookingTool } from './tools/bookingTool.js';
import { trackingTool } from './tools/trackingTool.js';
import { calculateRateTool } from './tools/calculateRateTool.js';
import { complaintTool } from './tools/complaintTool.js';
import { paymentTool } from './tools/paymentTool.js';

async function runTests() {
    console.log('--- Starting Tool Verification (Phase 2) ---');

    // 1. Initialize DB
    initDb();

    // 2. Test Rate Calculator Tool [NEW]
    console.log('\nTesting Rate Calculator (Volumetric vs Actual)...');
    const rateResult = await (calculateRateTool as any).execute({
        actual_weight: 4,
        length: 23,
        width: 14,
        height: 4,
        service_type: 'Express',
        origin_country: 'Sri Lanka',
        destination_country: 'Japan'
    });
    console.log('Rate Result:', rateResult.report);

    console.log('\nTesting Booking Tool (DHL-Style)...');
    const bookingResult = await (bookingTool as any).execute({
        shipment_type: 'Package',
        sender_name: 'Siluni Perera',
        sender_address1: '123 Galle Road',
        sender_postal_code: '00300',
        sender_city: 'Colombo',
        sender_country: 'Sri Lanka',
        sender_phone: '+94 77 123 4567',
        sender_email: 'siluni@example.com',
        receiver_name: 'Dilshani Silva',
        receiver_address1: '456 Sakura Blvd',
        receiver_postal_code: '160-0022',
        receiver_city: 'Tokyo',
        receiver_country: 'Japan',
        receiver_phone: '+81 90 1234 5678',
        receiver_email: 'dilshani@example.com',
        parcel_weight: 4,
        parcel_length: 23,
        parcel_width: 14,
        parcel_height: 4,
        service_type: 'Express'
    });
    console.log('Booking Result:', bookingResult.report);
    const trackingNum = (bookingResult as any).tracking_number;

    console.log('\nTesting Tracking Tool (With History)...');
    const trackingResult = await (trackingTool as any).execute({ tracking_number: trackingNum });
    console.log('Tracking Result (Initial):', trackingResult.report);

    console.log('\n--- Tool Verification Complete (Phase 2) ---');
}

runTests().catch(console.error);
