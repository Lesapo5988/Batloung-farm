import { AppError } from './errorHandler.ts';

export const VALID_PROVINCES = [
  'Gauteng',
  'Free State',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
] as const;

export const VALID_PACKAGING_SIZES = ['small', 'medium', 'large'] as const;
export type PackagingSize = (typeof VALID_PACKAGING_SIZES)[number];

export const VALID_PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT'] as const;
export type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export function parsePositiveIntId(raw: unknown, label = 'ID'): number {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(400, `Invalid ${label}: must be a positive integer.`);
  }
  return num;
}

export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, `${fieldName} is required and must be a non-empty string.`);
  }
  return value.trim();
}

export function requirePositiveNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(400, `${fieldName} must be a valid number greater than 0.`);
  }
  return num;
}

export function requirePositiveInt(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(400, `${fieldName} must be a whole number greater than 0.`);
  }
  return num;
}

export function validateProvince(value: unknown): string {
  const province = requireNonEmptyString(value, 'Province');
  if (!VALID_PROVINCES.includes(province as (typeof VALID_PROVINCES)[number])) {
    throw new AppError(
      400,
      `Invalid province "${province}". Must be a South African province (${VALID_PROVINCES.join(', ')}).`
    );
  }
  return province;
}

export function validatePackagingSize(value: unknown): PackagingSize {
  if (typeof value !== 'string') {
    throw new AppError(400, 'Packaging size must be small, medium, or large.');
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_PACKAGING_SIZES.includes(normalized as PackagingSize)) {
    throw new AppError(
      400,
      `Invalid packaging size "${value}". Allowed values: small, medium, large.`
    );
  }
  return normalized as PackagingSize;
}

export function validatePaymentMethod(value: unknown): PaymentMethod {
  if (typeof value !== 'string') {
    throw new AppError(400, 'Payment method must be CASH, MOBILE_MONEY, or CREDIT.');
  }
  const normalized = value.trim().toUpperCase();
  if (!VALID_PAYMENT_METHODS.includes(normalized as PaymentMethod)) {
    throw new AppError(
      400,
      `Invalid payment method "${value}". Allowed values: CASH, MOBILE_MONEY, CREDIT.`
    );
  }
  return normalized as PaymentMethod;
}
