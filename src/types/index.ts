/**
 * Type definitions for Add to Attio extension
 */

// Platform types
export type Platform = 'linkedin' | 'twitter' | 'reddit';

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
}

// Attio person record (simplified for extension use)
export interface AttioPerson {
  id: string;
  name: string;
  attioUrl: string | null;
}

// Response from checkPerson action
export interface CheckPersonResponse {
  exists: boolean;
  person?: AttioPerson;
  profileData?: ProfileData;
  error?: string;
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
export interface AttioValuesInput {
  name?: Array<{ full_name: string }>;
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
  | RefreshBadgeMessage;

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
