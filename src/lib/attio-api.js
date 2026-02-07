/**
 * Attio API client for person record management
 */

const ATTIO_API_BASE = 'https://api.attio.com/v2';

/**
 * Error class for Attio API errors
 */
export class AttioApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'AttioApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Build values object from person data for Attio API
 * @param {Object} personData - Person data
 * @returns {Object} - Values object for Attio API
 */
function buildValuesObject(personData) {
  const values = {};

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
 * @param {Response} response - Fetch response object
 * @throws {AttioApiError}
 */
async function handleApiError(response) {
  const errorBody = await response.json().catch(() => ({}));

  switch (response.status) {
    case 401:
      throw new AttioApiError('Invalid API key. Please check your credentials.', 401, errorBody);
    case 403:
      throw new AttioApiError('Access denied. Your API key may not have the required permissions.', 403, errorBody);
    case 429:
      throw new AttioApiError('Rate limit exceeded. Please try again in a moment.', 429, errorBody);
    case 400:
      throw new AttioApiError(`Invalid request: ${errorBody.message || 'Bad request'}`, 400, errorBody);
    default:
      throw new AttioApiError(`Attio API error: ${response.statusText}`, response.status, errorBody);
  }
}

/**
 * Create a new person record in Attio
 *
 * @param {string} apiKey - Attio API key
 * @param {Object} personData - Person data to create
 * @returns {Promise<Object>} - Created person record
 */
export async function createPerson(apiKey, personData) {
  const values = buildValuesObject(personData);
  const url = `${ATTIO_API_BASE}/objects/people/records`;

  console.log('[Add to Attio API] Creating person:', { url, values });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: { values }
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Update an existing person record in Attio
 *
 * @param {string} apiKey - Attio API key
 * @param {string} recordId - Attio record ID to update
 * @param {Object} personData - Person data to update
 * @returns {Promise<Object>} - Updated person record
 */
export async function updatePerson(apiKey, recordId, personData) {
  const values = buildValuesObject(personData);
  const url = `${ATTIO_API_BASE}/objects/people/records/${recordId}`;

  console.log('[Add to Attio API] Updating person:', { url, recordId, values });

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: { values }
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Get the search value from person data based on platform
 * @param {string} platform - Platform identifier
 * @param {Object} personData - Person data
 * @returns {string|null} - Value to search by
 */
function getSearchValue(platform, personData) {
  switch (platform) {
    case 'linkedin':
      return personData.linkedinUrl;
    case 'twitter':
      return personData.twitterHandle;
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
 *
 * @param {string} apiKey - Attio API key
 * @param {Object} personData - Person data to create/update
 * @param {string} personData.fullName - Person's full name
 * @param {string} [personData.linkedinUrl] - LinkedIn profile URL
 * @param {string} [personData.twitterHandle] - Twitter/X handle
 * @param {string} [personData.redditUsername] - Reddit username
 * @param {string} [personData.description] - Person's headline/bio
 * @param {string} matchingAttribute - Attribute to use for deduplication lookup
 * @param {string} platform - Platform identifier (linkedin, twitter, reddit)
 * @returns {Promise<Object>} - Created/updated person record
 */
export async function upsertPerson(apiKey, personData, matchingAttribute, platform) {
  // Get the value to search by for this platform
  const searchValue = getSearchValue(platform, personData);

  console.log('[Add to Attio API] Upserting person:', {
    platform,
    matchingAttribute,
    searchValue
  });

  // Step 1: Query for existing record
  const existingPerson = searchValue
    ? await findPersonByAttribute(apiKey, matchingAttribute, searchValue)
    : null;

  // Step 2: Create or update based on result
  if (existingPerson) {
    const recordId = existingPerson.id?.record_id;
    console.log('[Add to Attio API] Found existing person, updating:', recordId);
    return await updatePerson(apiKey, recordId, personData);
  } else {
    console.log('[Add to Attio API] No existing person found, creating new');
    return await createPerson(apiKey, personData);
  }
}

/**
 * Find a person record by a specific attribute value
 *
 * @param {string} apiKey - Attio API key
 * @param {string} attribute - Attribute to search by (e.g., 'linkedin_url', 'twitter')
 * @param {string} value - Value to search for
 * @returns {Promise<Object|null>} - Person record if found, null otherwise
 */
export async function findPersonByAttribute(apiKey, attribute, value) {
  const url = `${ATTIO_API_BASE}/objects/people/records/query`;

  // Build filter based on attribute type
  // Text/URL attributes need nested { value: { $contains/$eq: ... } } structure
  // Name attribute needs { full_name: { $eq: ... } } structure
  let filterValue;
  if (attribute === 'name') {
    filterValue = {
      full_name: {
        $eq: value
      }
    };
  } else if (attribute === 'linkedin') {
    // For LinkedIn URLs, extract username and use $contains for flexible matching
    // This handles variations like trailing slash, www vs no www
    const usernameMatch = value.match(/linkedin\.com\/in\/([^/?]+)/);
    const username = usernameMatch ? usernameMatch[1] : value;
    filterValue = {
      value: {
        $contains: username
      }
    };
  } else {
    // Other text attributes like twitter, description - use exact match
    filterValue = {
      value: {
        $eq: value
      }
    };
  }

  const requestBody = {
    filter: {
      [attribute]: filterValue
    },
    limit: 1
  };

  console.log('[Add to Attio API] Query request:', {
    url,
    attribute,
    value,
    searchValue: filterValue?.value?.$contains || filterValue?.value?.$eq || filterValue?.full_name?.$eq,
    filter: JSON.stringify(requestBody.filter)
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('[Add to Attio API] Response status:', response.status);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error('[Add to Attio API] Query error:', { status: response.status, body: errorBody });

    // If 404 or other error, treat as not found
    if (response.status === 404) {
      return null;
    }

    // Extract error message from response body
    const errorMessage = errorBody?.message || errorBody?.error || response.statusText || `HTTP ${response.status}`;
    throw new AttioApiError(`Search failed: ${errorMessage}`, response.status, errorBody);
  }

  const result = await response.json();
  console.log('[Add to Attio API] Query result:', { count: result.data?.length || 0 });

  // Return first matching record or null
  if (result.data && result.data.length > 0) {
    return result.data[0];
  }

  return null;
}

/**
 * Get the workspace slug for constructing Attio URLs
 * @param {string} apiKey - Attio API key
 * @returns {Promise<string|null>} - Workspace slug or null
 */
export async function getWorkspaceSlug(apiKey) {
  try {
    const response = await fetch(`${ATTIO_API_BASE}/self`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.data?.workspace?.slug || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate an API key by making a test request
 * @param {string} apiKey - Attio API key to validate
 * @returns {Promise<boolean>} - True if valid
 */
export async function validateApiKey(apiKey) {
  try {
    const response = await fetch(`${ATTIO_API_BASE}/self`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}
