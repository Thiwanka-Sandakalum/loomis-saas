import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { useShipmentData } from './composables/use-shipment-data';
import { CreateShipmentRequest } from './models/shipment.model';

@Component({
    selector: 'app-shipment-create',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Create New Shipment</h1>
        <p class="text-gray-600 mt-1">Fill in the details to book a new delivery</p>
      </div>

      @if (errorMessage()) {
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {{ errorMessage() }}
        </div>
      }

      <form [formGroup]="shipmentForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Shipment Type & Service -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-4">Shipment Details</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Shipment Type *</label>
              <select formControlName="shipmentType" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                <option value="Document">Document</option>
                <option value="Package">Package</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
              <select formControlName="serviceType" class="w-full border border-gray-300 rounded-lg px-4 py-2">
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
                <option value="Overnight">Overnight</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
              <input type="number" step="0.1" formControlName="weight" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Customer Reference</label>
              <input type="text" formControlName="customerReference" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>
        </div>

        <!-- Sender Information -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-4">Sender Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input type="text" formControlName="senderName" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input type="tel" formControlName="senderPhone" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <input type="text" formControlName="senderAddress1" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input type="text" formControlName="senderCity" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
              <input type="text" formControlName="senderPostalCode" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <input type="text" formControlName="senderCountry" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>
        </div>

        <!-- Receiver Information -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-4">Receiver Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input type="text" formControlName="receiverName" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input type="tel" formControlName="receiverPhone" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <input type="text" formControlName="receiverAddress1" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input type="text" formControlName="receiverCity" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
              <input type="text" formControlName="receiverPostalCode" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <input type="text" formControlName="receiverCountry" 
                     class="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-4">
          <button type="button" (click)="onCancel()" 
                  class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" [disabled]="shipmentData.isCreating() || !shipmentForm.valid"
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            @if (shipmentData.isCreating()) {
              Creating...
            } @else {
              Create Shipment
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ShipmentCreateComponent implements OnInit {
    protected shipmentData = useShipmentData();
    protected shipmentForm: FormGroup;
    protected errorMessage = signal<string | null>(null);

    constructor(
        private fb: FormBuilder,
        private router: Router
    ) {
        this.shipmentForm = this.fb.group({
            shipmentType: ['Package', Validators.required],
            serviceType: ['Standard', Validators.required],
            weight: [0, [Validators.required, Validators.min(0.1)]],
            customerReference: [''],

            senderName: ['', Validators.required],
            senderPhone: ['', Validators.required],
            senderAddress1: ['', Validators.required],
            senderCity: ['', Validators.required],
            senderPostalCode: ['', Validators.required],
            senderCountry: ['', Validators.required],

            receiverName: ['', Validators.required],
            receiverPhone: ['', Validators.required],
            receiverAddress1: ['', Validators.required],
            receiverCity: ['', Validators.required],
            receiverPostalCode: ['', Validators.required],
            receiverCountry: ['', Validators.required],
        });
    }

    ngOnInit() { }

    async onSubmit() {
        if (this.shipmentForm.valid) {
            try {
                const request: CreateShipmentRequest = this.shipmentForm.value;
                const result = await this.shipmentData.createShipment(request);
                this.router.navigate(['/shipments']);
            } catch (error: any) {
                this.errorMessage.set(error.message || 'Failed to create shipment');
            }
        }
    }

    onCancel() {
        this.router.navigate(['/shipments']);
    }
}
