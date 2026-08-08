/**
 * Validation Schemas for Packages — Milestone 8.9.
 */

import * as yup from "yup";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const packageFormSchema = yup.object({
  name: yup.string().required("Name is required").min(2).max(120),
  description: yup.string().nullable().optional().max(2000),
  totalCredits: yup.number().required("Credits required").integer().min(1).max(1000),
  validityDays: yup.number().nullable().optional().integer().min(1).max(3650),
  isActive: yup.boolean().optional().default(true),
  isPublic: yup.boolean().optional().default(false),
});

export const packageServiceSchema = yup.object({
  serviceId: yup.string().required().matches(UUID_REGEX, "Invalid service ID"),
  creditsRequired: yup.number().required().integer().min(1).max(100),
});

export const assignPackageSchema = yup.object({
  customerId: yup.string().required("Customer is required").matches(UUID_REGEX),
  packageId: yup.string().required("Package is required").matches(UUID_REGEX),
  note: yup.string().nullable().optional().max(500),
});

export const adjustCreditsSchema = yup.object({
  customerPackageId: yup.string().required().matches(UUID_REGEX),
  delta: yup.number().required("Amount is required").integer().notOneOf([0], "Cannot be zero"),
  reason: yup.string().required("Reason is required").min(1).max(500),
});

export type PackageFormValues = yup.InferType<typeof packageFormSchema>;
