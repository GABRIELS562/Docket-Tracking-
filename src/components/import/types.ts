/**
 * Types for Bulk Docket Import feature
 */

export interface DocketEntry {
  id: string;
  labNumber: string;
  caseNumber: string;
  rfidEpc: string;
  description: string;
  category: string;
  exhibitNumber?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export interface QRCodeData {
  labNumber: string;
  caseNumber: string;
}

export interface ImportMessage {
  type: 'success' | 'error';
  text: string;
}

export type DocketStatus = DocketEntry['status'];

export const CATEGORY_OPTIONS = [
  { value: 'firearm', label: 'Firearm' },
  { value: 'drug', label: 'Drug' },
  { value: 'digital', label: 'Digital' },
  { value: 'biological', label: 'Biological' },
  { value: 'document', label: 'Document' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' },
] as const;
