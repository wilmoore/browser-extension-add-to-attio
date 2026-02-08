/**
 * Attio API client for person record management
 */

import { ATTIO_API_BASE } from '../constants/index.js';
import { log } from './logger.js';
import type {
  Platform,
  ProfileData,
  AttioRecord,
  AttioRecordResponse,
  AttioValuesInput,
  AttioQueryFilter,
} from '../types/index.js';

/**
 * Error class for Attio API errors
 */
export class AttioApiError extends Error {
  statusCode: number;
  details: unknown;

  constructor(message: string, statusCode: number, details: unknown = null) {
    super(message);
    this.name = 'AttioApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Build values object from person data for Attio API
 */
function buildValuesObject(personData: ProfileData): AttioValuesInput {
  const values: AttioValuesInput = {};

  if (personData.fullName) {
    values.name = [{ full_name: personData.fullName }];
  }

  if (personData.linkedinUrl) {
    values.linkedin = [{ value: personData.linkedinUrl }];
  }

  if (personData.twitterHandle) {
    values.twitter = [{ value: personData.twitterHandle }];
  }

  if (personData.description) {
    values.description = [{ value: personData.description }];
  }

  return values;
}

/**
 * Handle API error responses consistently
 */
async function handleApiError(response: Response): Promise<never> {
  const errorBody = await response.json().catch(() => ({}));

  switch (response.status) {
    case 401:
      throw new AttioApiError('Invalid API key. Please check your credentials.', 401, errorBody);
    case 403:
      throw new AttioApiError('Access denied. Your API key may not have the required permissions.', 403, errorBody);
    case 429:
      throw new AttioApiError('Rate limit exceeded. Please try again in a moment.', 429, errorBody);
    case 400:
      throw new AttioApiError(`Invalid request: ${(errorBody as { message?: string }).message || 'Bad request'}`, 400, errorBody);
    default:
      throw new AttioApiError(`Attio API error: ${response.statusText}`, response.status, errorBody);
  }
}

/**
 * Create a new person record in Attio
 */
export async function createPerson(apiKey: string, personData: ProfileData): Promise<AttioRecordResponse> {
  const values = buildValuesObject(personData);
  const url = `${ATTIO_API_BASE}/objects/people/records`;

  log.api('Creating person: %O', { url, values });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: { values },
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Update an existing person record in Attio
 */
export async function updatePerson(apiKey: string, recordId: string, personData: ProfileData): Promise<AttioRecordResponse> {
  const values = buildValuesObject(personData);
  const url = `${ATTIO_API_BASE}/objects/people/records/${recordId}`;

  log.api('Updating person: %O', { url, recordId, values });

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: { values },
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Get the search value from person data based on platform
 */
function getSearchValue(platform: Platform, personData: ProfileData): string | null {
  switch (platform) {
    case 'linkedin':
      return personData.linkedinUrl || null;
    case 'twitter':
      return personData.twitterHandle || null;
    case 'reddit':
      return personData.fullName;
    default:
      return null;
  }
}

/**
 * Upsert a person record in Attio using query-then-create/update pattern
 *
 * This approach is required because Attio's matching_attribute parameter
 * only works with unique attributes, and 'linkedin' is not unique for
 * the People standard object.
 */
export async function upsertPerson(
  apiKey: string,
  personData: ProfileData,
  matchingAttribute: string,
  platform: Platform
): Promise<AttioRecordResponse> {
  // Get the value to search by for this platform
  const searchValue = getSearchValue(platform, personData);

  log.api('Upserting person: %O', {
    platform,
    matchingAttribute,
    searchValue,
  });

  // Step 1: Query for existing record
  const existingPerson = searchValue
    ? await findPersonByAttribute(apiKey, matchingAttribute, searchValue)
    : null;

  // Step 2: Create or update based on result
  if (existingPerson) {
    const recordId = existingPerson.id?.record_id;
    log.api('Found existing person, updating: %s', recordId);
    return await updatePerson(apiKey, recordId, personData);
  } else {
    log.api('No existing person found, creating new');
    return await createPerson(apiKey, personData);
  }
}

/**
 * Find a person record by a specific attribute value
 */
export async function findPersonByAttribute(
  apiKey: string,
  attribute: string,
  value: string
): Promise<AttioRecord | null> {
  const url = `${ATTIO_API_BASE}/objects/people/records/query`;

  // Build filter based on attribute type
  // Text/URL attributes need nested { value: { $contains/$eq: ... } } structure
  // Name attribute needs { full_name: { $eq: ... } } structure
  let filterValue: AttioQueryFilter[string];
  if (attribute === 'name') {
    filterValue = {
      full_name: {
        $eq: value,
      },
    };
  } else if (attribute === 'linkedin') {
    // For LinkedIn URLs, extract username and use $contains for flexible matching
    // This handles variations like trailing slash, www vs no www
    const usernameMatch = value.match(/linkedin\.com\/in\/([^/?]+)/);
    const username = usernameMatch ? usernameMatch[1] : value;
    filterValue = {
      value: {
        $contains: username,
      },
    };
  } else {
    // Other text attributes like twitter, description - use exact match
    filterValue = {
      value: {
        $eq: value,
      },
    };
  }

  const requestBody = {
    filter: {
      [attribute]: filterValue,
    } as AttioQueryFilter,
    limit: 1,
  };

  log.api('Query request: %O', {
    url,
    attribute,
    value,
    searchValue: filterValue?.value?.$contains || filterValue?.value?.$eq || filterValue?.full_name?.$eq,
    filter: JSON.stringify(requestBody.filter),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  log.api('Response status: %d', response.status);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    log.api('Query error: %O', { status: response.status, body: errorBody });

    // If 404 or other error, treat as not found
    if (response.status === 404) {
      return null;
    }

    // Extract error message from response body
    const errorMessage = (errorBody as { message?: string; error?: string })?.message ||
      (errorBody as { message?: string; error?: string })?.error ||
      response.statusText ||
      `HTTP ${response.status}`;
    throw new AttioApiError(`Search failed: ${errorMessage}`, response.status, errorBody);
  }

  const result = await response.json() as { data?: AttioRecord[] };
  log.api('Query result: %O', { count: result.data?.length || 0 });

  // Return first matching record or null
  if (result.data && result.data.length > 0) {
    return result.data[0];
  }

  return null;
}

interface WorkspaceResponse {
  data?: {
    workspace?: {
      slug?: string;
    };
  };
}

/**
 * Get the workspace slug for constructing Attio URLs
 */
export async function getWorkspaceSlug(apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${ATTIO_API_BASE}/self`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as WorkspaceResponse;
      const slug = data.data?.workspace?.slug || null;
      log.api('getWorkspaceSlug result: %O', {
        slug,
        workspaceData: data.data?.workspace,
      });
      return slug;
    }
    log.api('getWorkspaceSlug failed: %d', response.status);
    return null;
  } catch (error) {
    log.api('getWorkspaceSlug error: %O', error);
    return null;
  }
}

/**
 * Validate an API key by making a test request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${ATTIO_API_BASE}/self`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
