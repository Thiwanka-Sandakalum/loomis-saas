import { FormGroup, FormControl, Validators } from '@angular/forms';

export interface CompanyProfileForm {
    companyName: string;
    country: string;
    companySize: string;
}

export function createCompanyProfileForm() {
    return new FormGroup({
        companyName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        companySize: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    });
}
