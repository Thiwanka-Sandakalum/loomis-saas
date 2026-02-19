import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
    providedIn: 'root'
})
export class ValidationService {
    // Email validation with more comprehensive check
    static emailValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const valid = emailRegex.test(control.value);

            return valid ? null : { invalidEmail: true };
        };
    }

    // Phone number validation (international format)
    static phoneValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            const valid = phoneRegex.test(control.value.replace(/[\s-]/g, ''));

            return valid ? null : { invalidPhone: true };
        };
    }

    // Tracking number validation (LMS-XXXXX format)
    static trackingNumberValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const trackingRegex = /^LMS-[A-Z0-9]{5,}$/;
            const valid = trackingRegex.test(control.value);

            return valid ? null : { invalidTrackingNumber: true };
        };
    }

    // URL validation (HTTPS only for production)
    static httpsUrlValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            try {
                const url = new URL(control.value);
                const valid = url.protocol === 'https:';
                return valid ? null : { httpsRequired: true };
            } catch {
                return { invalidUrl: true };
            }
        };
    }

    // Postal code validation (multiple formats)
    static postalCodeValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            // US: 12345 or 12345-6789
            // UK: SW1A 1AA
            // Canada: A1A 1A1
            const postalRegex = /^[A-Z0-9]{3,10}([\s-][A-Z0-9]{3,4})?$/i;
            const valid = postalRegex.test(control.value);

            return valid ? null : { invalidPostalCode: true };
        };
    }

    // Weight validation (positive number)
    static positiveNumberValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const value = parseFloat(control.value);
            const valid = !isNaN(value) && value > 0;

            return valid ? null : { mustBePositive: true };
        };
    }

    // Currency amount validation
    static currencyValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const value = parseFloat(control.value);
            const valid = !isNaN(value) && value >= 0 && this.hasValidDecimalPlaces(value);

            return valid ? null : { invalidCurrency: true };
        };
    }

    private static hasValidDecimalPlaces(value: number): boolean {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        return decimalPlaces <= 2;
    }

    // API key format validation
    static apiKeyValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;

            const apiKeyRegex = /^cmp_(live|test)_[a-zA-Z0-9]{20,}$/;
            const valid = apiKeyRegex.test(control.value);

            return valid ? null : { invalidApiKey: true };
        };
    }

    // Get user-friendly error messages
    static getErrorMessage(errors: ValidationErrors): string {
        if (errors['required']) return 'This field is required';
        if (errors['email']) return 'Please enter a valid email address';
        if (errors['invalidEmail']) return 'Please enter a valid email address';
        if (errors['invalidPhone']) return 'Please enter a valid phone number';
        if (errors['invalidTrackingNumber']) return 'Tracking number must be in format: LMS-XXXXX';
        if (errors['httpsRequired']) return 'URL must use HTTPS protocol';
        if (errors['invalidUrl']) return 'Please enter a valid URL';
        if (errors['invalidPostalCode']) return 'Please enter a valid postal code';
        if (errors['mustBePositive']) return 'Value must be greater than 0';
        if (errors['invalidCurrency']) return 'Please enter a valid amount (max 2 decimal places)';
        if (errors['invalidApiKey']) return 'Invalid API key format';
        if (errors['minlength']) return `Minimum length is ${errors['minlength'].requiredLength} characters`;
        if (errors['maxlength']) return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
        if (errors['min']) return `Minimum value is ${errors['min'].min}`;
        if (errors['max']) return `Maximum value is ${errors['max'].max}`;
        if (errors['pattern']) return 'Invalid format';

        return 'Invalid input';
    }

    // Sanitize input to prevent XSS
    static sanitizeInput(input: string): string {
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // Validate file upload
    static validateFile(file: File, options: {
        maxSizeMB?: number;
        allowedTypes?: string[];
    }): { valid: boolean; error?: string } {
        const maxSize = (options.maxSizeMB || 5) * 1024 * 1024; // Default 5MB

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size must be less than ${options.maxSizeMB || 5}MB`
            };
        }

        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `File type not allowed. Accepted types: ${options.allowedTypes.join(', ')}`
            };
        }

        return { valid: true };
    }
}
