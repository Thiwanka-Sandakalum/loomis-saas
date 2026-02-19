using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace CoreCourierService.Api.Validators
{
    /// <summary>
    /// Domain validation service with reusable validation rules
    /// </summary>
    public static class DomainValidator
    {
        public static ValidationResult ValidateShipment(CreateShipmentRequest request)
        {
            var errors = new List<string>();

            // Sender validation
            if (string.IsNullOrWhiteSpace(request.SenderName))
                errors.Add("Sender name is required");
            if (string.IsNullOrWhiteSpace(request.SenderAddress1))
                errors.Add("Sender address is required");
            if (string.IsNullOrWhiteSpace(request.SenderCity))
                errors.Add("Sender city is required");
            if (string.IsNullOrWhiteSpace(request.SenderCountry))
                errors.Add("Sender country is required");
            if (string.IsNullOrWhiteSpace(request.SenderPostalCode))
                errors.Add("Sender postal code is required");
            if (string.IsNullOrWhiteSpace(request.SenderPhone))
                errors.Add("Sender phone is required");

            // Receiver validation
            if (string.IsNullOrWhiteSpace(request.ReceiverName))
                errors.Add("Receiver name is required");
            if (string.IsNullOrWhiteSpace(request.ReceiverAddress1))
                errors.Add("Receiver address is required");
            if (string.IsNullOrWhiteSpace(request.ReceiverCity))
                errors.Add("Receiver city is required");
            if (string.IsNullOrWhiteSpace(request.ReceiverCountry))
                errors.Add("Receiver country is required");
            if (string.IsNullOrWhiteSpace(request.ReceiverPostalCode))
                errors.Add("Receiver postal code is required");
            if (string.IsNullOrWhiteSpace(request.ReceiverPhone))
                errors.Add("Receiver phone is required");

            // Package validation
            if (request.Weight <= 0)
                errors.Add("Weight must be greater than 0");
            if (request.Weight > 1000)
                errors.Add("Weight cannot exceed 1000 kg");

            // Validate phone numbers
            if (!IsValidPhoneNumber(request.SenderPhone))
                errors.Add("Sender phone number format is invalid");
            if (!IsValidPhoneNumber(request.ReceiverPhone))
                errors.Add("Receiver phone number format is invalid");

            // Validate postal codes
            if (!IsValidPostalCode(request.SenderPostalCode, request.SenderCountry))
                errors.Add("Sender postal code format is invalid");
            if (!IsValidPostalCode(request.ReceiverPostalCode, request.ReceiverCountry))
                errors.Add("Receiver postal code format is invalid");

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors
            };
        }

        public static ValidationResult ValidateRate(CreateRateRequest request)
        {
            var errors = new List<string>();

            if (request.MinWeight < 0)
                errors.Add("Minimum weight cannot be negative");
            if (request.MaxWeight <= request.MinWeight)
                errors.Add("Maximum weight must be greater than minimum weight");
            if (request.BasePrice < 0)
                errors.Add("Base price cannot be negative");
            if (request.PricePerKg < 0)
                errors.Add("Price per kg cannot be negative");
            if (request.VolumetricDivisor <= 0)
                errors.Add("Volumetric divisor must be greater than 0");
            if (request.FuelSurchargePercent < 0 || request.FuelSurchargePercent > 100)
                errors.Add("Fuel surcharge must be between 0 and 100 percent");
            if (string.IsNullOrWhiteSpace(request.Currency))
                errors.Add("Currency is required");
            if (!IsValidCurrency(request.Currency))
                errors.Add("Invalid currency code");

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors
            };
        }

        public static ValidationResult ValidateTeamMemberInvite(InviteTeamMemberRequest request)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(request.Email))
                errors.Add("Email is required");
            else if (!IsValidEmail(request.Email))
                errors.Add("Invalid email format");

            if (string.IsNullOrWhiteSpace(request.Name))
                errors.Add("Name is required");

            var validRoles = new[] { "Admin", "CSR", "Customer" };
            if (!validRoles.Contains(request.Role))
                errors.Add($"Role must be one of: {string.Join(", ", validRoles)}");

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors
            };
        }

        public static ValidationResult ValidateApiKey(string apiKey)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                errors.Add("API key is required");
            }
            else
            {
                // Format: cmp_live_XXXXX or cmp_test_XXXXX
                var isValid = apiKey.StartsWith("cmp_live_") || apiKey.StartsWith("cmp_test_");
                if (!isValid)
                    errors.Add("Invalid API key format");

                if (apiKey.Length < 30)
                    errors.Add("API key is too short");
            }

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors
            };
        }

        public static bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        public static bool IsValidPhoneNumber(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return false;

            // Remove common formatting characters
            var cleaned = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());

            // Must be 10-15 digits (with optional + prefix)
            return cleaned.Length >= 10 && cleaned.Length <= 15;
        }

        public static bool IsValidPostalCode(string postalCode, string country)
        {
            if (string.IsNullOrWhiteSpace(postalCode))
                return false;

            // Basic validation - can be enhanced per country
            return postalCode.Length >= 3 && postalCode.Length <= 10;
        }

        public static bool IsValidCurrency(string currency)
        {
            var validCurrencies = new[] { "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "INR" };
            return validCurrencies.Contains(currency?.ToUpper());
        }

        public static bool IsValidTrackingNumber(string trackingNumber)
        {
            if (string.IsNullOrWhiteSpace(trackingNumber))
                return false;

            // Format: LMS-XXXXX
            return trackingNumber.StartsWith("LMS-") && trackingNumber.Length >= 9;
        }

        public static string SanitizeInput(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // Remove potentially harmful characters
            return input
                .Replace("<", "")
                .Replace(">", "")
                .Replace("\"", "")
                .Replace("'", "")
                .Trim();
        }
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();

        public string GetErrorMessage()
        {
            return string.Join("; ", Errors);
        }
    }

    // Request DTOs (matching what we use)
    public class CreateShipmentRequest
    {
        public string SenderName { get; set; } = string.Empty;
        public string SenderAddress1 { get; set; } = string.Empty;
        public string SenderCity { get; set; } = string.Empty;
        public string SenderCountry { get; set; } = string.Empty;
        public string SenderPostalCode { get; set; } = string.Empty;
        public string SenderPhone { get; set; } = string.Empty;
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverAddress1 { get; set; } = string.Empty;
        public string ReceiverCity { get; set; } = string.Empty;
        public string ReceiverCountry { get; set; } = string.Empty;
        public string ReceiverPostalCode { get; set; } = string.Empty;
        public string ReceiverPhone { get; set; } = string.Empty;
        public decimal Weight { get; set; }
    }

    public class CreateRateRequest
    {
        public decimal MinWeight { get; set; }
        public decimal MaxWeight { get; set; }
        public decimal BasePrice { get; set; }
        public decimal PricePerKg { get; set; }
        public int VolumetricDivisor { get; set; }
        public decimal FuelSurchargePercent { get; set; }
        public string Currency { get; set; } = string.Empty;
    }

    public class InviteTeamMemberRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
