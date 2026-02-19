import { inject, signal, computed } from '@angular/core';
import { Shipment, ShipmentFilters, ShipmentStats, CreateShipmentRequest } from '../models/shipment.model';
import { ShipmentsService } from '../../../core/api-client';

export function useShipmentData() {
    const shipmentService = inject(ShipmentsService);

    // State signals
    const shipments = signal<Shipment[]>([]);
    const filters = signal<ShipmentFilters>({});
    const isLoading = signal(false);
    const selectedShipment = signal<Shipment | null>(null);
    const isCreating = signal(false);

    // Computed values
    const filteredShipments = computed(() => {
        let result = shipments();
        const currentFilters = filters();

        if (currentFilters.status && currentFilters.status.length > 0) {
            result = result.filter((s) => currentFilters.status!.includes(s.status));
        }

        if (currentFilters.serviceType && currentFilters.serviceType.length > 0) {
            result = result.filter((s) => currentFilters.serviceType!.includes(s.serviceType));
        }

        if (currentFilters.search) {
            const search = currentFilters.search.toLowerCase();
            result = result.filter(
                (s) =>
                    s.trackingNumber.toLowerCase().includes(search) ||
                    s.senderName.toLowerCase().includes(search) ||
                    s.receiverName.toLowerCase().includes(search) ||
                    s.customerReference?.toLowerCase().includes(search)
            );
        }

        if (currentFilters.dateFrom) {
            result = result.filter((s) => new Date(s.createdAt) >= currentFilters.dateFrom!);
        }

        if (currentFilters.dateTo) {
            result = result.filter((s) => new Date(s.createdAt) <= currentFilters.dateTo!);
        }

        return result;
    });

    const stats = computed<ShipmentStats>(() => {
        const all = shipments();
        return {
            total: all.length,
            created: all.filter((s) => s.status === 'Created').length,
            inTransit: all.filter((s) => s.status === 'InTransit' || s.status === 'PickedUp').length,
            delivered: all.filter((s) => s.status === 'Delivered').length,
            cancelled: all.filter((s) => s.status === 'Cancelled').length,
        };
    });

    // Actions
    const loadShipments = async () => {
        isLoading.set(true);
        try {
            const response = await shipmentService.apiShipmentsGet();
            shipments.set((response as any) || []);
        } catch (error) {
            console.error('Error loading shipments:', error);
        } finally {
            isLoading.set(false);
        }
    };

    const loadShipmentByTracking = async (trackingNumber: string) => {
        try {
            const response = await shipmentService.apiShipmentsTrackingTrackingNumberGet(trackingNumber);
            return response;
        } catch (error) {
            console.error('Error loading shipment:', error);
            throw error;
        }
    };

    const createShipment = async (request: CreateShipmentRequest) => {
        isCreating.set(true);
        try {
            const response = await shipmentService.apiShipmentsPost(request as any);

            await loadShipments(); // Refresh list
            return response;
        } catch (error) {
            console.error('Error creating shipment:', error);
            throw error;
        } finally {
            isCreating.set(false);
        }
    };

    const updateShipmentStatus = async (trackingNumber: string, newStatus: Shipment['status']) => {
        try {
            // TODO: Add update status endpoint
            console.log('Updating shipment status:', trackingNumber, newStatus);

            // Optimistic update
            shipments.update((items) =>
                items.map((s) =>
                    s.trackingNumber === trackingNumber ? { ...s, status: newStatus, updatedAt: new Date() } : s
                )
            );
        } catch (error) {
            console.error('Error updating shipment status:', error);
            throw error;
        }
    };

    const updateFilters = (newFilters: Partial<ShipmentFilters>) => {
        filters.update((current) => ({ ...current, ...newFilters }));
    };

    const selectShipment = (shipment: Shipment | null) => {
        selectedShipment.set(shipment);
    };

    const deleteShipment = async (trackingNumber: string) => {
        try {
            // TODO: Add delete endpoint if needed
            shipments.update((items) => items.filter((s) => s.trackingNumber !== trackingNumber));
        } catch (error) {
            console.error('Error deleting shipment:', error);
            throw error;
        }
    };

    return {
        // State
        shipments: shipments.asReadonly(),
        filteredShipments,
        filters: filters.asReadonly(),
        isLoading: isLoading.asReadonly(),
        isCreating: isCreating.asReadonly(),
        selectedShipment: selectedShipment.asReadonly(),
        stats,

        // Actions
        loadShipments,
        loadShipmentByTracking,
        createShipment,
        updateShipmentStatus,
        updateFilters,
        selectShipment,
        deleteShipment,
    };
}
