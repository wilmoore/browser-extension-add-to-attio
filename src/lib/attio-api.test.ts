/**
 * Tests for Attio API client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AttioApiError,
  createPerson,
  updatePerson,
  findPersonByAttribute,
  getWorkspaceSlug,
  validateApiKey,
} from './attio-api.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('AttioApiError', () => {
  it('creates error with message and status code', () => {
    const error = new AttioApiError('Test error', 400);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('AttioApiError');
  });

  it('creates error with details', () => {
    const details = { field: 'name', issue: 'required' };
    const error = new AttioApiError('Validation error', 400, details);

    expect(error.details).toEqual(details);
  });
});

describe('createPerson', () => {
  it('sends POST request with correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: { record_id: '123' } } }),
    });

    await createPerson('test-api-key', {
      fullName: 'John Doe',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.attio.com/v2/objects/people/records',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            values: {
              name: [{ full_name: 'John Doe' }],
              linkedin: [{ value: 'https://linkedin.com/in/johndoe' }],
            },
          },
        }),
      })
    );
  });

  it('throws AttioApiError on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({}),
    });

    await expect(createPerson('invalid-key', { fullName: 'Test' }))
      .rejects.toThrow(AttioApiError);
  });

  it('throws AttioApiError on 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({}),
    });

    await expect(createPerson('test-key', { fullName: 'Test' }))
      .rejects.toThrow('Access denied');
  });

  it('throws AttioApiError on 429', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: () => Promise.resolve({}),
    });

    await expect(createPerson('test-key', { fullName: 'Test' }))
      .rejects.toThrow('Rate limit exceeded');
  });
});

describe('updatePerson', () => {
  it('sends PATCH request with correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: { record_id: '123' } } }),
    });

    await updatePerson('test-api-key', 'record-123', {
      fullName: 'John Doe Updated',
      description: 'New headline',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.attio.com/v2/objects/people/records/record-123',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            values: {
              name: [{ full_name: 'John Doe Updated' }],
              description: [{ value: 'New headline' }],
            },
          },
        }),
      })
    );
  });
});

describe('findPersonByAttribute', () => {
  it('queries with name filter for reddit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await findPersonByAttribute('test-key', 'name', 'John Doe');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.attio.com/v2/objects/people/records/query',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          filter: {
            name: {
              full_name: { $eq: 'John Doe' },
            },
          },
          limit: 1,
        }),
      })
    );
  });

  it('queries with linkedin filter using $contains for username', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await findPersonByAttribute('test-key', 'linkedin', 'https://linkedin.com/in/johndoe');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          filter: {
            linkedin: {
              value: { $contains: 'johndoe' },
            },
          },
          limit: 1,
        }),
      })
    );
  });

  it('queries with twitter filter using $eq', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await findPersonByAttribute('test-key', 'twitter', 'johndoe');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          filter: {
            twitter: {
              value: { $eq: 'johndoe' },
            },
          },
          limit: 1,
        }),
      })
    );
  });

  it('returns first person when found', async () => {
    const mockPerson = {
      id: { record_id: '123' },
      values: { name: [{ full_name: 'John Doe' }] },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [mockPerson] }),
    });

    const result = await findPersonByAttribute('test-key', 'linkedin', 'https://linkedin.com/in/johndoe');

    expect(result).toEqual(mockPerson);
  });

  it('returns null when no person found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const result = await findPersonByAttribute('test-key', 'linkedin', 'https://linkedin.com/in/nonexistent');

    expect(result).toBeNull();
  });

  it('returns null on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    const result = await findPersonByAttribute('test-key', 'linkedin', 'https://linkedin.com/in/test');

    expect(result).toBeNull();
  });
});

describe('getWorkspaceSlug', () => {
  it('returns workspace slug on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          workspace: { slug: 'my-workspace' },
        },
      }),
    });

    const result = await getWorkspaceSlug('test-key');

    expect(result).toBe('my-workspace');
  });

  it('returns null on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await getWorkspaceSlug('invalid-key');

    expect(result).toBeNull();
  });

  it('returns null on fetch exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await getWorkspaceSlug('test-key');

    expect(result).toBeNull();
  });
});

describe('validateApiKey', () => {
  it('returns true for valid API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const result = await validateApiKey('valid-key');

    expect(result).toBe(true);
  });

  it('returns false for invalid API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await validateApiKey('invalid-key');

    expect(result).toBe(false);
  });

  it('returns false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await validateApiKey('test-key');

    expect(result).toBe(false);
  });
});
