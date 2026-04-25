using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using CoreCourierService.Api.DTOs;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core;

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

            if (request.Sender == null)
            {
                errors.Add("Sender is required");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.Sender.Name))
                    errors.Add("Sender name is required");
                if (string.IsNullOrWhiteSpace(request.Sender.Address))
                    errors.Add("Sender address is required");
                if (string.IsNullOrWhiteSpace(request.Sender.City))
                    errors.Add("Sender city is required");
                if (string.IsNullOrWhiteSpace(request.Sender.Country))
                    errors.Add("Sender country is required");
                if (string.IsNullOrWhiteSpace(request.Sender.Phone))
                    errors.Add("Sender phone is required");
                else if (!IsValidPhoneNumber(request.Sender.Phone))
                    errors.Add("Sender phone number format is invalid");
            }

            if (request.Receiver == null)
            {
                errors.Add("Receiver is required");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.Receiver.Name))
                    errors.Add("Receiver name is required");
                if (string.IsNullOrWhiteSpace(request.Receiver.Address))
                    errors.Add("Receiver address is required");
                if (string.IsNullOrWhiteSpace(request.Receiver.City))
                    errors.Add("Receiver city is required");
                if (string.IsNullOrWhiteSpace(request.Receiver.Country))
                    errors.Add("Receiver country is required");
                if (string.IsNullOrWhiteSpace(request.Receiver.Phone))
                    errors.Add("Receiver phone is required");
                else if (!IsValidPhoneNumber(request.Receiver.Phone))
                    errors.Add("Receiver phone number format is invalid");
            }

            if (request.Parcel == null)
            {
                errors.Add("Parcel info is required");
            }
            else
            {
                if (request.Parcel.Weight <= 0)
                    errors.Add("Weight must be greater than 0");
                if (request.Parcel.Weight > 1000)
                    errors.Add("Weight cannot exceed 1000 kg");
            }

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

            if (!ServiceConstants.UserRoles.All.Contains(request.Role))
                errors.Add($"Role must be one of: {string.Join(", ", ServiceConstants.UserRoles.All)}");

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
