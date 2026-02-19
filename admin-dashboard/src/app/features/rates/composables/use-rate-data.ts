import { inject, signal, computed } from '@angular/core';
import { Rate, CreateRateRequest, RateCalculationRequest, RateCalculationResponse } from '../models/rate.model';
import { RatesService } from '../../../core/api-client';

export function useRateData() {
    const ratesService = inject(RatesService);

    // State signals
    const rates = signal<Rate[]>([]);
    const isLoading = signal(false);
    const selectedRate = signal<Rate | null>(null);
    const calculationResult = signal<RateCalculationResponse | null>(null);
    const isCalculating = signal(false);

    // Computed values
    const activeRates = computed(() => rates().filter((r) => r.isActive));

    const ratesByService = computed(() => {
        const grouped = new Map<string, Rate[]>();
        rates().forEach((rate) => {
            const key = rate.serviceType;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(rate);
        });
        return grouped;
    });

    // Actions
    const loadRates = async () => {
        isLoading.set(true);
        try {
            const response = await ratesService.apiRatesGet();
            rates.set((response as any) || []);
        } catch (error) {
            console.error('Error loading rates:', error);
        } finally {
            isLoading.set(false);
        }
    };

    const createRate = async (request: CreateRateRequest) => {
        try {
            const response = await ratesService.apiRatesPost(request as any);

            await loadRates(); // Refresh list
            return response;
        } catch (error) {
            console.error('Error creating rate:', error);
            throw error;
        }
    };

    const updateRate = async (id: string, request: Partial<CreateRateRequest>) => {
        try {
            const response = await ratesService.apiRatesRateIdPatch(id, request as any);

            await loadRates(); // Refresh list
            return response;
        } catch (error) {
            console.error('Error updating rate:', error);
            throw error;
        }
    };

    const deleteRate = async (id: string) => {
        try {
            await ratesService.apiRatesRateIdDelete(id);
            rates.update((items) => items.filter((r) => r.id !== id));
        } catch (error) {
            console.error('Error deleting rate:', error);
            throw error;
        }
    };

    const calculateRate = async (request: RateCalculationRequest) => {
        isCalculating.set(true);
        try {
            const response = await ratesService.apiRatesCalculatePost(request as any);

            calculationResult.set(response as any);
            return response;
        } catch (error) {
            console.error('Error calculating rate:', error);
            throw error;
        } finally {
            isCalculating.set(false);
        }
    };

    const selectRate = (rate: Rate | null) => {
        selectedRate.set(rate);
    };

    return {
        // State
        rates: rates.asReadonly(),
        activeRates,
        ratesByService,
        isLoading: isLoading.asReadonly(),
        isCalculating: isCalculating.asReadonly(),
        selectedRate: selectedRate.asReadonly(),
        calculationResult: calculationResult.asReadonly(),

        // Actions
        loadRates,
        createRate,
        updateRate,
        deleteRate,
        calculateRate,
        selectRate,
    };
}
