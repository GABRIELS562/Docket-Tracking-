export interface DocketRegistrationFormData {
  labNumber: string;
  caseNumber: string;
  rfidEpc: string;
  description: string;
  category: string;
  exhibitNumber?: string;
  receivedBy?: string;
}

export interface QRCodeData {
  labNumber: string;
  caseNumber: string;
}

export interface FormMessage {
  type: 'success' | 'error';
  text: string;
}

export type ScanMode = 'qr' | 'rfid' | null;

export const INITIAL_FORM_DATA: DocketRegistrationFormData = {
  labNumber: '',
  caseNumber: '',
  rfidEpc: '',
  description: '',
  category: 'other',
};

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
