export interface IndividualGuest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  token: string;
  hasUsedToken: boolean;
  plusOneEligible: boolean;
  plusOneName?: string;
  plusOneEmail?: string;
  invitationGroup?: string;
  dietaryRestrictions?: string[];
  specialNotes?: string;
  createdAt: Date;
  lastAccessed?: Date;
}

export interface GuestToken {
  id: string;
  name: string;
  email: string;
  token: string;
  maxGuests: number;
  isUsed: boolean;
}

export interface RSVPFormData {
  guestToken: string;
  isAttending: boolean;
  guestCount: number;
  guestNames: string[];
  dietaryRestrictions: string[];
  mealChoices: MealChoice[];
  songRequest?: string;
  specialRequests?: string;
  email: string;
  phone?: string;
}

export interface MealChoice {
  guestName: string;
  appetizer: string;
  mainCourse: string;
  dessert: string;
}

export interface MenuOption {
  id: string;
  name: string;
  description: string;
  category: 'appetizer' | 'main' | 'dessert';
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  allergens?: string[];
}

export interface RSVPSubmission {
  token: string;
  guestName: string;
  email?: string;
  isAttending: boolean;
  mealChoice?: string;
  dietaryRestrictions?: string;
  plusOneName?: string;
  plusOneMealChoice?: string;
  plusOneDietaryRestrictions?: string;
  wantsEmailConfirmation: boolean;
  specialRequests?: string;
  submittedAt: string;
}

export interface WeddingInfo {
  bride: {
    name: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  groom: {
    name: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  date: {
    ceremony: Date;
    reception: Date;
    rsvpDeadline: Date;
  };
  venue: {
    ceremony: VenueDetails;
    reception: VenueDetails;
  };
  timeline: TimelineEvent[];
  registry: RegistryItem[];
  cashGifts: CashGiftOption[];
  accommodations: AccommodationOption[];
  transportation: TransportationOption[];
  localAttractions: LocalAttraction[];
  contacts: WeddingContact[];
  weddingParty?: {
    bridesmaids: WeddingPartyMember[];
    groomsmen: WeddingPartyMember[];
    maidOfHonor?: WeddingPartyMember;
    bestMan?: WeddingPartyMember;
  };
  importantInfo: {
    dressCode: string;
    ceremony: {
      isUnplugged: boolean;
      notes?: string[];
    };
    reception: {
      isOpenBar: boolean;
      musicRequests: boolean;
      dancingInfo?: string;
      notes?: string[];
    };
    gifts: {
      preferredDelivery: 'venue' | 'home' | 'registry';
      homeAddress?: string;
      registryNotes?: string;
    };
    specialConsiderations?: string[];
  };
  hashtag?: string;
  website?: string;
}

export interface WeddingPartyMember {
  id: string;
  name: string;
  role: string;
  relationship: string;
  photo?: string;
  bio?: string;
}

export interface VenueDetails {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  website?: string;
  phone?: string;
  description?: string;
  photos?: VenuePhoto[];
  parkingInfo?: string;
  accessibilityInfo?: string;
  dresscode?: string;
}

export interface VenuePhoto {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  isMain?: boolean;
}

export interface AccommodationOption {
  id: string;
  name: string;
  type: 'hotel' | 'airbnb' | 'other';
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distanceFromVenue: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  amenities: string[];
  bookingUrl: string;
  phone?: string;
  website?: string;
  photos?: string[];
  groupRate?: {
    available: boolean;
    code?: string;
    description?: string;
    deadline?: Date;
  };
  rating?: number;
  reviewCount?: number;
}

export interface TransportationOption {
  id: string;
  type: 'airport_shuttle' | 'rideshare' | 'rental_car' | 'public_transit' | 'taxi';
  name: string;
  description: string;
  estimatedCost?: string;
  estimatedTime?: string;
  bookingInfo?: string;
  contactInfo?: string;
  website?: string;
  notes?: string;
}

export interface LocalAttraction {
  id: string;
  name: string;
  type: 'restaurant' | 'attraction' | 'shopping' | 'entertainment' | 'outdoor' | 'cultural';
  description: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  website?: string;
  phone?: string;
  hours?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  rating?: number;
  photos?: string[];
  distanceFromVenue?: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  description?: string;
  location?: string;
}

export interface RegistryItem {
  id: string;
  name: string;
  description?: string;
  store: string;
  url: string;
  price?: number;
  originalPrice?: number;
  image?: string;
  category: 'kitchen' | 'home' | 'bedroom' | 'bathroom' | 'outdoor' | 'experience' | 'cash';
  priority: 'high' | 'medium' | 'low';
  quantity?: number;
  purchased?: number;
  isAvailable: boolean;
  notes?: string;
}

export interface CashGiftOption {
  id: string;
  type: 'venmo' | 'bank_transfer' | 'paypal' | 'zelle' | 'honeymoon_fund';
  name: string;
  description: string;
  instructions: string;
  qrCode?: string;
  accountInfo?: {
    username?: string;
    handle?: string;
    email?: string;
    lastFourDigits?: string;
  };
  isActive: boolean;
  icon?: string;
}

export interface WeddingContact {
  role: 'bride' | 'groom' | 'maid_of_honor' | 'best_man' | 'wedding_planner' | 'venue_coordinator';
  name: string;
  phone: string;
  email: string;
  preferredContact: 'phone' | 'email' | 'text';
  availability?: string;
}

export interface GoogleSheetsConfig {
  apiKey: string;
  sheetId: string;
  range: string;
}

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface ScrollSection {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TokenValidationResult {
  isValid: boolean;
  guest?: IndividualGuest;
  error?: string;
  securityFlags?: {
    rateLimited: boolean;
    suspiciousActivity: boolean;
    ipBlocked: boolean;
  };
}

export interface SecurityConfig {
  tokenLength: number;
  allowedAttempts: number;
  lockoutDuration: number;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  requireHttps: boolean;
}

export interface GuestValidationRules {
  emailRequired: boolean;
  phoneRequired: boolean;
  minNameLength: number;
  maxNameLength: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
}