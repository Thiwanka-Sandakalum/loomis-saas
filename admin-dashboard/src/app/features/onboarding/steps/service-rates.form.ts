import { FormGroup, FormControl, Validators, FormArray } from '@angular/forms';

export interface ServiceRateForm {
    type: string;
    enabled: boolean;
    baseRate: number;
    additionalPerKg: number;
}

export function createServiceRatesForm() {
    return new FormGroup({
        rates: new FormArray([])
    });
}
