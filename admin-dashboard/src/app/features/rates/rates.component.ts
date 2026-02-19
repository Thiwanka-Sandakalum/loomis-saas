import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { useRateData } from './composables/use-rate-data';
import { Rate, CreateRateRequest } from './models/rate.model';

@Component({
    selector: 'app-rates',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Rates & Pricing</h1>
        <p class="text-gray-600 mt-1">Configure shipping rates for your services</p>
      </div>

      <!-- Create/Edit Rate Form -->
      <div class="bg-white p-6 rounded-lg shadow mb-6">
        <h2 class="text-lg font-semibold mb-4">{{ isEditing() ? 'Edit Rate' : 'Create New Rate' }}</h2>
        
        <form [formGroup]="rateForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
              <select formControlName="serviceType" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
                <option value="Overnight">Overnight</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Shipment Type *</label>
              <select formControlName="shipmentType" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                <option value="Document">Document</option>
                <option value="Package">Package</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
              <input type="text" formControlName="currency" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Origin Country</label>
              <input type="text" formControlName="originCountry" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Destination Country</label>
              <input type="text" formControlName="destinationCountry" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Min Weight (kg) *</label>
              <input type="number" step="0.1" formControlName="minWeight" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Max Weight (kg) *</label>
              <input type="number" step="0.1" formControlName="maxWeight" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
              <input type="number" step="0.01" formControlName="basePrice" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Price per KG *</label>
              <input type="number" step="0.01" formControlName="pricePerKg" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Volumetric Divisor *</label>
              <input type="number" formControlName="volumetricDivisor" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Fuel Surcharge (%) *</label>
              <input type="number" step="0.1" formControlName="fuelSurchargePercent" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Remote Surcharge</label>
              <input type="number" step="0.01" formControlName="remoteSurcharge" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>

          <div class="flex justify-end gap-4">
            @if (isEditing()) {
              <button type="button" (click)="cancelEdit()" 
                      class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            }
            <button type="submit" [disabled]="!rateForm.valid"
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ isEditing() ? 'Update Rate' : 'Create Rate' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Rates List -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold">Configured Rates</h2>
        </div>
        
        @if (rateData.isLoading()) {
          <div class="text-center py-12">Loading rates...</div>
        } @else if (rateData.rates().length === 0) {
          <div class="text-center py-12 text-gray-500">
            No rates configured yet. Create your first rate above.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Service</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Route</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Weight Range</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Base Price</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Per KG</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (rate of rateData.rates(); track rate.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm font-medium">{{ rate.serviceType }}</td>
                    <td class="px-6 py-4 text-sm">{{ rate.shipmentType }}</td>
                    <td class="px-6 py-4 text-sm">
                      {{ rate.originCountry || 'Any' }} → {{ rate.destinationCountry || 'Any' }}
                    </td>
                    <td class="px-6 py-4 text-sm">{{ rate.minWeight }} - {{ rate.maxWeight }} kg</td>
                    <td class="px-6 py-4 text-sm">{{ rate.currency }} {{ rate.basePrice }}</td>
                    <td class="px-6 py-4 text-sm">{{ rate.currency }} {{ rate.pricePerKg }}</td>
                    <td class="px-6 py-4">
                      <span [class]="rate.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                            class="px-3 py-1 rounded-full text-xs font-medium">
                        {{ rate.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex gap-2">
                        <button (click)="editRate(rate)" 
                                class="text-blue-600 hover:text-blue-800 text-sm">
                          Edit
                        </button>
                        <button (click)="deleteRate(rate.id)" 
                                class="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class RatesComponent implements OnInit {
    protected rateData = useRateData();
    protected rateForm: FormGroup;
    protected isEditing = signal(false);
    protected editingRateId = signal<string | null>(null);

    constructor(private fb: FormBuilder) {
        this.rateForm = this.fb.group({
            serviceType: ['Standard', Validators.required],
            shipmentType: ['Package', Validators.required],
            originCountry: [''],
            destinationCountry: [''],
            minWeight: [0, [Validators.required, Validators.min(0)]],
            maxWeight: [100, [Validators.required, Validators.min(0.1)]],
            basePrice: [0, [Validators.required, Validators.min(0)]],
            pricePerKg: [0, [Validators.required, Validators.min(0)]],
            volumetricDivisor: [5000, [Validators.required, Validators.min(1)]],
            fuelSurchargePercent: [10, [Validators.required, Validators.min(0)]],
            remoteSurcharge: [0],
            currency: ['USD', Validators.required],
        });
    }

    async ngOnInit() {
        await this.rateData.loadRates();
    }

    async onSubmit() {
        if (this.rateForm.valid) {
            try {
                const request: CreateRateRequest = this.rateForm.value;

                if (this.isEditing() && this.editingRateId()) {
                    await this.rateData.updateRate(this.editingRateId()!, request);
                } else {
                    await this.rateData.createRate(request);
                }

                this.rateForm.reset({
                    serviceType: 'Standard',
                    shipmentType: 'Package',
                    volumetricDivisor: 5000,
                    fuelSurchargePercent: 10,
                    currency: 'USD',
                });
                this.isEditing.set(false);
                this.editingRateId.set(null);
            } catch (error) {
                console.error('Error saving rate:', error);
            }
        }
    }

    editRate(rate: Rate) {
        this.rateForm.patchValue(rate);
        this.isEditing.set(true);
        this.editingRateId.set(rate.id);
    }

    cancelEdit() {
        this.rateForm.reset({
            serviceType: 'Standard',
            shipmentType: 'Package',
            volumetricDivisor: 5000,
            fuelSurchargePercent: 10,
            currency: 'USD',
        });
        this.isEditing.set(false);
        this.editingRateId.set(null);
    }

    async deleteRate(id: string) {
        if (confirm('Are you sure you want to delete this rate?')) {
            try {
                await this.rateData.deleteRate(id);
            } catch (error) {
                console.error('Error deleting rate:', error);
            }
        }
    }
}
