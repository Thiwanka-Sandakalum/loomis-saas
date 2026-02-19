import { getDb } from '../infra/db/connection.js';

const STATUS_FLOW = ['Created', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];
const LOCATIONS = ['Distribution Center', 'Local Sorting Facility', 'Transit Hub', 'Delivery Vehicle', 'Destination Address'];

export function startStatusSimulator() {
    console.log('Status Simulator started.');

    // Run every 30 seconds for simulation purposes
    setInterval(async () => {
        try {
            const db = getDb();
            // Find shipments that are not 'Delivered'
            const activeShipments = await db.collection('shipments').find({ status: { $ne: 'Delivered' } }, { projection: { tracking_number: 1, status: 1 } }).toArray();

            for (const shipment of activeShipments) {
                const currentIndex = STATUS_FLOW.indexOf(shipment.status);
                if (currentIndex < STATUS_FLOW.length - 1) {
                    const nextStatus = STATUS_FLOW[currentIndex + 1];
                    const nextLocation = LOCATIONS[currentIndex + 1];

                    // Update shipment status
                    await db.collection('shipments').updateOne(
                        { tracking_number: shipment.tracking_number },
                        { $set: { status: nextStatus } }
                    );

                    // Log event
                    await db.collection('shipment_events').insertOne({
                        tracking_number: shipment.tracking_number,
                        status: nextStatus,
                        location: nextLocation,
                        timestamp: new Date(),
                    });

                    console.log(`[Simulator] Updated ${shipment.tracking_number} to ${nextStatus}`);
                }
            }
        } catch (error) {
            console.error('[Simulator] Error updating statuses:', error);
        }
    }, 30000);
}
