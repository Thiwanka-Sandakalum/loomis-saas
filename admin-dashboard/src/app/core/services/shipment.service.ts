import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { ShipmentsService as ShipmentsApiService } from '../api-client/api/shipments.service';
import { ShipmentResponse, ShipmentResponsePagedResponse } from '../api-client/model/models';
import {
    Shipment,
    ShipmentFilters,
    PaginatedResponse,
    CreateShipmentRequest,
    ShipmentStatus,
    ShipmentEvent,
    Address
} from '../models';

@Injectable({ providedIn: 'root' })
export class ShipmentService {
    private shipmentsApi = inject(ShipmentsApiService);

    getShipments(filters: ShipmentFilters = {}): Observable<PaginatedResponse<Shipment>> {
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 10;
        const status = filters.status !== 'all' ? filters.status : undefined;

        // TODO: Add search, serviceType, dateFrom, dateTo parameters when API supports them
        return this.shipmentsApi.apiShipmentsGet(page, pageSize, status).pipe(
            map((response) => this.mapShipmentPage(response, page, pageSize))
        );
    }

    getShipmentById(id: string): Observable<Shipment> {
        return this.getShipmentByTracking(id);
    }

    getShipmentByTracking(trackingNumber: string): Observable<Shipment> {
        return this.shipmentsApi.apiShipmentsTrackingTrackingNumberGet(trackingNumber).pipe(
            map((response) => {
                const shipment = this.mapShipmentResponse(response);
                if (!shipment) throw new Error(`Shipment ${trackingNumber} not found`);
                return shipment;
            })
        );
    }

    createShipment(data: CreateShipmentRequest): Observable<Shipment> {
        return this.shipmentsApi.apiShipmentsPost(data).pipe(
            map((response) => {
                const shipment = this.mapShipmentResponse(response);
                if (!shipment) throw new Error('Failed to create shipment');
                return shipment;
            })
        );
    }

    updateStatus(shipmentId: string, status: ShipmentStatus, location: string, notes?: string): Observable<Shipment> {
        return this.shipmentsApi.apiShipmentsTrackingTrackingNumberStatusPatch(
            shipmentId,
            { status, location, notes }
        ).pipe(
            map((response) => {
                const shipment = this.mapShipmentResponse(response);
                if (!shipment) throw new Error('Failed to update shipment status');
                return shipment;
            })
        );
    }

    bulkUpdateStatus(shipmentIds: string[], status: ShipmentStatus): Observable<void> {
        // TODO: Implement when API endpoint is available
        return of(void 0).pipe(delay(800));
    }

    deleteShipment(id: string): Observable<void> {
        // TODO: Implement when API endpoint is available
        return of(void 0).pipe(delay(500));
    }

    private mapShipmentPage(
        response: ShipmentResponsePagedResponse,
        page: number,
        pageSize: number
    ): PaginatedResponse<Shipment> {
        const shipments = (response.data ?? []).map((item) => this.mapShipmentResponse(item))
            .filter((item): item is Shipment => item !== null);

        const total = response.pagination?.totalItems ?? shipments.length;
        return {
            data: shipments,
            total,
            page: response.pagination?.page ?? page,
            pageSize: response.pagination?.pageSize ?? pageSize
        };
    }

    private mapShipmentResponse(response: ShipmentResponse | null | undefined): Shipment | null {
        if (!response) {
            return null;
        }

        const origin = this.mapAddress(response.sender);
        const destination = this.mapAddress(response.receiver);
        const createdAt = response.createdAt ? new Date(response.createdAt) : new Date();
        const eta = response.estimatedDelivery ? new Date(response.estimatedDelivery) : new Date();

        return {
            id: response.id ?? response.trackingNumber ?? crypto.randomUUID(),
            trackingNumber: response.trackingNumber ?? 'N/A',
            origin,
            destination,
            serviceType: this.normalizeServiceType(response.serviceType),
            weight: response.parcel?.weight ?? 0,
            cost: response.parcel?.value ?? 0,
            status: this.normalizeStatus(response.status),
            statusLabel: response.status ?? undefined,
            eta,
            customerName: response.receiver?.name ?? 'Unknown Customer',
            customerPhone: response.receiver?.phone ?? 'N/A',
            createdAt,
            updatedAt: createdAt,
            timeline: [],
            senderName: response.sender?.name ?? undefined,
            senderPhone: response.sender?.phone ?? undefined,
            senderEmail: response.sender?.email ?? null,
            receiverName: response.receiver?.name ?? undefined,
            receiverPhone: response.receiver?.phone ?? undefined,
            receiverEmail: response.receiver?.email ?? null,
            parcelDescription: response.parcel?.description ?? null,
            parcelLength: response.parcel?.length ?? null,
            parcelWidth: response.parcel?.width ?? null,
            parcelHeight: response.parcel?.height ?? null,
            parcelValue: response.parcel?.value ?? null
        };
    }

    private mapAddress(contact?: { address?: string | null; city?: string | null; country?: string | null }): Address {
        return {
            street: contact?.address ?? 'Unknown',
            city: contact?.city ?? 'Unknown',
            state: '',
            postalCode: '',
            country: contact?.country ?? 'Unknown'
        };
    }

    private normalizeServiceType(value?: string | null): Shipment['serviceType'] {
        const normalized = value?.toLowerCase() ?? 'standard';
        if (normalized.includes('express')) return 'Express';
        if (normalized.includes('overnight')) return 'Overnight';
        return 'Standard';
    }

    private normalizeStatus(value?: string | null): ShipmentStatus {
        const normalized = value?.toLowerCase()?.replace(/_/g, '-') ?? 'pending';
        if (normalized.includes('picked')) return 'picked-up';
        if (normalized.includes('in-transit') || normalized.includes('transit')) return 'in-transit';
        if (normalized.includes('out-for-delivery') || normalized.includes('out')) return 'out-for-delivery';
        if (normalized.includes('delivered')) return 'delivered';
        if (normalized.includes('delayed')) return 'delayed';
        if (normalized.includes('cancelled') || normalized.includes('canceled')) return 'cancelled';
        return 'pending';
    }

}
