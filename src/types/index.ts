/**
 * Type definitions for Add to Attio extension
 */

// Platform types
export type Platform = 'linkedin' | 'twitter' | 'reddit';

// Fields supported by popup diff/update UI
export type PersonFieldKey = 'name' | 'linkedin' | 'twitter' | 'description';

// Profile data extracted from content scripts
export interface ProfileData {
  fullName: string | null;
  linkedinUrl?: string;
  twitterHandle?: string;
  redditUsername?: string;
  username?: string;
  description?: string | null;
  profileUrl?: string;
  error?: string;
  // Extended fields for person-first dropdown (v1)
  avatarUrl?: string;           // Profile photo URL
  company?: string;             // Current company name
  location?: string;            // Location text (visible on page)
  connectionDegree?: string;    // "1st", "2nd", "3rd" or null
  hasContactInfo?: boolean;     // Whether Contact Info link is visible
}

// Attio person record (simplified for extension use)
export interface AttioPerson {
  id: string;
  name: string;
  attioUrl: string | null;
}

// Subset of Attio values used for popup diffing
export interface AttioPersonValues {
  name: string | null;
  linkedin: string | null;
  twitter: string | null;
  description: string | null;
}

// Response from checkPerson action
export interface CheckPersonResponse {
  exists: boolean;
  person?: AttioPerson;
  personValues?: AttioPersonValues;
  profileData?: ProfileData;
  error?: string;
  /** Whether the content script is available for full profile extraction */
  contentScriptAvailable?: boolean;
}

// Response from captureProfile action
export interface CaptureResponse {
  success: boolean;
  data?: AttioRecordResponse;
  attioUrl?: string;
  error?: string;
}

// Attio API record response
export interface AttioRecordResponse {
  data: AttioRecord;
}

// Attio record from API
export interface AttioRecord {
  id: {
    record_id: string;
    object_id: string;
    workspace_id: string;
  };
  values: AttioRecordValues;
  created_at: string;
}

// Attio record values
export interface AttioRecordValues {
  name?: Array<{
    full_name?: string;
    first_name?: string;
    last_name?: string;
  }>;
  linkedin?: Array<{ value: string }>;
  twitter?: Array<{ value: string }>;
  description?: Array<{ value: string }>;
}

// Values object for Attio API create/update
// Note: Attio requires all three name properties when using object syntax
// See: https://docs.attio.com/docs/attribute-types/attribute-types-personal-name
export interface AttioValuesInput {
  name?: Array<{
    first_name: string;
    last_name: string;
    full_name: string;
  }>;
  linkedin?: Array<{ value: string }>;
  twitter?: Array<{ value: string }>;
  description?: Array<{ value: string }>;
}

// Attio query filter structure
export interface AttioQueryFilter {
  [attribute: string]: {
    value?: {
      $eq?: string;
      $contains?: string;
    };
    full_name?: {
      $eq?: string;
    };
  };
}

// Message types for chrome.runtime communication
export type MessageAction =
  | CheckPersonMessage
  | CaptureProfileMessage
  | ExtractProfileMessage
  | ShowFeedbackMessage
  | RefreshBadgeMessage
  | UpdatePersonFieldMessage;

export interface CheckPersonMessage {
  action: 'checkPerson';
  platform: Platform;
  tabId: number;
}

export interface CaptureProfileMessage {
  action: 'captureProfile';
  platform: Platform;
  tabId: number;
  isUpdate: boolean;
}

export interface ExtractProfileMessage {
  action: 'extractProfile';
}

export interface ShowFeedbackMessage {
  action: 'showFeedback';
  success: boolean;
  message: string;
}

export interface RefreshBadgeMessage {
  action: 'refreshBadge';
}

export interface UpdatePersonFieldMessage {
  action: 'updatePersonField';
  recordId: string;
  field: PersonFieldKey;
  value: string;
}

export interface UpdatePersonFieldResponse {
  success: boolean;
  error?: string;
}

// Badge state type
export interface BadgeState {
  text: string;
  color: string | [number, number, number, number];
}

// Storage keys
export interface StorageKeys {
  API_KEY: string;
  LAST_SYNC: string;
}
