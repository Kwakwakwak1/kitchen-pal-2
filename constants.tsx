import React from 'react';
import { Unit, FrequencyOfUse, MeasurementSystem } from './types';

export const APP_NAME = "Kitchen Pal"; // Updated App Name

export const LOCAL_STORAGE_USERS_KEY = 'kitchenPalUsers';
export const ACTIVE_USER_ID_KEY = 'kitchenPalActiveUserId';


export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const UNITS_ARRAY: Unit[] = Object.values(Unit);
export const FREQUENCY_OF_USE_OPTIONS = Object.values(FrequencyOfUse).map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }));
export const MEASUREMENT_SYSTEM_OPTIONS = Object.values(MeasurementSystem).map(ms => ({ value: ms, label: ms.charAt(0).toUpperCase() + ms.slice(1) }));


// Simplified conversion factors (mass to mass, volume to volume)
// Base units: GRAM for mass, MILLILITER for volume
const CONVERSION_FACTORS: Record<Unit, { base: Unit; factor: number } | null> = {
  [Unit.GRAM]: { base: Unit.GRAM, factor: 1 },
  [Unit.KILOGRAM]: { base: Unit.GRAM, factor: 1000 },
  [Unit.OUNCE]: { base: Unit.GRAM, factor: 28.3495 }, // weight oz
  [Unit.POUND]: { base: Unit.GRAM, factor: 453.592 },
  [Unit.MILLILITER]: { base: Unit.MILLILITER, factor: 1 },
  [Unit.LITER]: { base: Unit.MILLILITER, factor: 1000 },
  [Unit.TEASPOON]: { base: Unit.MILLILITER, factor: 4.92892 },
  [Unit.TABLESPOON]: { base: Unit.MILLILITER, factor: 14.7868 },
  [Unit.CUP]: { base: Unit.MILLILITER, factor: 236.588 }, // US cup. Note: this is volume. Grams for 'cup of flour' is ingredient-dependent.
  [Unit.PIECE]: null, // Cannot be directly converted without context
  [Unit.PINCH]: null, // Typically small volume, treated as 'piece' or user manages
  [Unit.DASH]: null,  // Typically small volume, treated as 'piece' or user manages
  [Unit.NONE]: null,
};

export const getBaseUnitAndFactor = (unit: Unit): { baseUnit: Unit; totalFactor: number } | null => {
  const conversion = CONVERSION_FACTORS[unit];
  if (!conversion) return null;
  return { baseUnit: conversion.base, totalFactor: conversion.factor };
};

// Tries to convert quantity from one unit to another if they share a base unit type (mass or volume)
export const convertUnit = (quantity: number, fromUnit: Unit, toUnit: Unit): number | null => {
  if (fromUnit === toUnit) return quantity;

  const fromConversion = getBaseUnitAndFactor(fromUnit);
  const toConversion = getBaseUnitAndFactor(toUnit);

  if (fromConversion && toConversion && fromConversion.baseUnit === toConversion.baseUnit) {
    const quantityInBase = quantity * fromConversion.totalFactor;
    return quantityInBase / toConversion.totalFactor;
  }
  
  // If units are not convertible (e.g. piece to gram, or different base types)
  return null; 
};

// Normalize ingredient names for consistent matching
export const normalizeIngredientName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, ' '); // Also normalize multiple spaces
};

// Date utility for expiration
export const isItemExpiringSoon = (expirationDate?: string, daysThreshold: number = 7): boolean => {
  if (!expirationDate) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day
    const expiry = new Date(expirationDate); // Assumes YYYY-MM-DD
    expiry.setHours(0,0,0,0); // Normalize expiry to start of day

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= daysThreshold; // Expiring today or in the next `daysThreshold` days
  } catch (e) {
    console.error("Error parsing expiration date:", e);
    return false;
  }
};

export const isItemExpired = (expirationDate?: string): boolean => {
  if (!expirationDate) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
     expiry.setHours(0,0,0,0);
    return expiry.getTime() < today.getTime();
  } catch (e) {
    console.error("Error parsing expiration date:", e);
    return false;
  }
};


// SVG Icons (Heroicons)
export const PlusIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.045-.501.232-.986.506-1.419M16.5 12.75V3.75m-6 9V3.75m0 0H12m-3 0H6.75M6 5.25H4.5" />
  </svg>
);

export const PencilIcon = ({ className = "w-5 h-5" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

export const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }): React.ReactElement => (
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

export const BookOpenIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6-2.292m0 0V3.75m0 16.5" />
  </svg>
);

export const ArchiveBoxIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);

export const ShoppingCartIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
  </svg>
);

export const BuildingStorefrontIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5A2.25 2.25 0 0 1 15.75 12h3a2.25 2.25 0 0 1 2.25 2.25V21M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5m0 13.5h2.25m-2.25 0h-2.25m2.25 0V12m0 9h2.25M12 12H9V7.5L12 3V7.5z" />
</svg>
);

export const ArrowLeftIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

export const MagnifyingGlassIcon = ({ className = "w-5 h-5" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

export const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008ZM12 15h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5v-.008ZM9.75 18h.008v.008H9.75v-.008ZM7.5 18h.008v.008H7.5v-.008ZM14.25 15h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008ZM16.5 15h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
  </svg>
);

export const SparklesIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => ( // For "Smart" features or new things
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 7.5l.813 2.846a4.5 4.5 0 012.139 2.139L22.75 12l-1.548.813a4.5 4.5 0 01-2.14 2.14l-.813 1.548L18.25 15l-.813-2.846a4.5 4.5 0 01-2.139-2.139L13.75 12l1.548-.813a4.5 4.5 0 012.14-2.14l.813-1.548z" />
  </svg>
);

export const CubeTransparentIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => ( // For Dashboard / Overview
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

export const UserCircleIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export const ArrowRightOnRectangleIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => ( // Login
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
  </svg>
);

export const UserPlusIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => ( // Signup
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5V7.5c0-1.31.99-2.426 2.276-2.711A6.375 6.375 0 0 1 12 4.875c1.31 0 2.548.392 3.601 1.082A2.836 2.836 0 0 1 18.375 7.5v10.875m-15 0c0 .621.504 1.125 1.125 1.125h14.083c.392-.16.768-.348 1.125-.563M3.375 19.5Z" />
  </svg>
);

export const ArrowLeftOnRectangleIcon = ({ className = "w-6 h-6" }: { className?: string }): React.ReactElement => ( // Logout
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H12" />
  </svg>
);

export const WrenchScrewdriverIcon = ({ className = "w-5 h-5" }: { className?: string }): React.ReactElement => ( // For fixing/correcting
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655-4.653a2.548 2.548 0 1 1 0-3.586l6.837 6.837M5.904 8.925l6.837 6.837M8.925 5.904l6.837 6.837M4.875 8.925h.008v.008H4.875V8.925z" />
  </svg>
);

export const DEFAULT_RECIPE_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80"; // More generic food image
export const DEFAULT_AVATAR_IMAGE = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80";

