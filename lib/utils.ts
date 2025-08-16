import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate unique 6-character enrollment code
export function generateEnrollmentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique enrollment codes for sections
export function generateSectionEnrollmentCodes(): { professorCode: string; studentCode: string } {
  const professorCode = generateEnrollmentCode();
  // Generate student code with 'S' suffix to ensure uniqueness
  const studentCode = generateEnrollmentCode() + 'S';
  return { professorCode, studentCode };
}
