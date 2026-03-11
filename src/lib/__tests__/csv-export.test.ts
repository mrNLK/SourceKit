import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EEAWebsetItem } from '@/types/eea';
import { exportEEAItemsToCSV } from '@/lib/csv-export';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<EEAWebsetItem> = {}): EEAWebsetItem {
  return {
    id: 'item-1',
    url: 'https://example.com/profile',
    title: 'Jane Doe',
    enrichments: [],
    ...overrides,
  };
}

/**
 * Extract the raw CSV text that was passed into the Blob constructor.
 * We intercept the global Blob and stash the first argument.
 */
function setupDOMMocks() {
  let capturedCSV = '';

  const mockLink: Record<string, any> = {
    href: '',
    download: '',
    click: vi.fn(),
  };

  // Blob -- capture the CSV content
  const BlobSpy = vi.fn().mockImplementation((parts: BlobPart[]) => {
    capturedCSV = parts[0] as string;
    return {}; // minimal stub; only used as an arg to createObjectURL
  });
  vi.stubGlobal('Blob', BlobSpy);

  // URL -- jsdom does not implement createObjectURL / revokeObjectURL, so
  // we assign mock functions directly rather than using spyOn.
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  URL.revokeObjectURL = vi.fn();

  // document.createElement -- only intercept <a> creation
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockLink as unknown as HTMLAnchorElement;
    return originalCreateElement(tag);
  });

  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

  return {
    getCSV: () => capturedCSV,
    mockLink,
    BlobSpy,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('exportEEAItemsToCSV', () => {
  let mocks: ReturnType<typeof setupDOMMocks>;

  beforeEach(() => {
    mocks = setupDOMMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // 1. Empty array early return
  it('does nothing when items array is empty', () => {
    exportEEAItemsToCSV([]);

    expect(mocks.BlobSpy).not.toHaveBeenCalled();
    expect(document.createElement).not.toHaveBeenCalled();
  });

  // 2. Correct CSV headers
  it('generates correct CSV headers with static columns, signal columns, and Verified Count', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        enrichments: [
          { signal_id: 's1', signal_name: 'Publications', value: '12', format: 'number', verified: true },
          { signal_id: 's2', signal_name: 'Patents', value: '3', format: 'number', verified: false },
        ],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const headerLine = csv.split('\n')[0];

    expect(headerLine).toBe('Name,URL,Email,EEA Strength,Publications,Patents,Verified Count');
  });

  // 3. Correct row data
  it('generates correct CSV row data mapping title, url, email, and eea_strength', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        title: 'Alice Smith',
        url: 'https://github.com/alice',
        email: 'alice@example.com',
        eea_strength: 'Strong',
        enrichments: [
          { signal_id: 's1', signal_name: 'Citations', value: '50', format: 'number', verified: true },
        ],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];

    expect(dataLine).toBe('Alice Smith,https://github.com/alice,alice@example.com,Strong,50,1');
  });

  // 4. Missing enrichment signals produce empty strings
  it('returns empty string for signals an item does not have', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        id: 'item-a',
        title: 'Bob',
        url: 'https://bob.dev',
        enrichments: [
          { signal_id: 's1', signal_name: 'Publications', value: '5', format: 'number', verified: false },
        ],
      }),
      makeItem({
        id: 'item-b',
        title: 'Carol',
        url: 'https://carol.dev',
        enrichments: [
          { signal_id: 's2', signal_name: 'Patents', value: '2', format: 'number', verified: true },
        ],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const lines = csv.split('\n');

    // Header: Name,URL,Email,EEA Strength,Publications,Patents,Verified Count
    expect(lines[0]).toBe('Name,URL,Email,EEA Strength,Publications,Patents,Verified Count');
    // Bob has Publications=5 but no Patents -> empty
    expect(lines[1]).toBe('Bob,https://bob.dev,,,5,,0');
    // Carol has Patents=2 but no Publications -> empty
    expect(lines[2]).toBe('Carol,https://carol.dev,,,,2,1');
  });

  // 5. Verified count
  it('correctly counts verified enrichments in the Verified Count column', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        enrichments: [
          { signal_id: 's1', signal_name: 'A', value: '1', format: 'text', verified: true },
          { signal_id: 's2', signal_name: 'B', value: '2', format: 'text', verified: true },
          { signal_id: 's3', signal_name: 'C', value: '3', format: 'text', verified: false },
        ],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];
    // Last column is verified count
    const columns = dataLine.split(',');
    const verifiedCount = columns[columns.length - 1];

    expect(verifiedCount).toBe('2');
  });

  // 6. CSV escaping -- commas
  it('escapes values containing commas by wrapping in double quotes', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        title: 'Doe, Jane',
        enrichments: [],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];

    // The title should be quoted: "Doe, Jane"
    expect(dataLine.startsWith('"Doe, Jane"')).toBe(true);
  });

  // 7. CSV escaping -- double quotes
  it('escapes values containing double quotes by doubling them', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        title: 'The "Great" Dev',
        enrichments: [],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];

    // Should become: "The ""Great"" Dev"
    expect(dataLine.startsWith('"The ""Great"" Dev"')).toBe(true);
  });

  // 8. Formula injection protection
  it('prefixes formula-triggering characters with a single quote', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        title: '=CMD("calc")',
        enrichments: [
          { signal_id: 's1', signal_name: 'Note', value: '+1234567890', format: 'text', verified: false },
        ],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];

    // Title starts with = so should be prefixed with '
    expect(dataLine).toContain("'=CMD");
    // Signal value starts with + so should be prefixed with '
    expect(dataLine).toContain("'+1234567890");
  });

  it('prefixes - and @ formula characters', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        title: '-@SUM(A1:A10)',
        enrichments: [],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];

    expect(dataLine).toContain("'-@SUM");
  });

  it('does not prefix normal values', () => {
    const items: EEAWebsetItem[] = [
      makeItem({
        title: 'John Smith',
        enrichments: [
          { signal_id: 's1', signal_name: 'Score', value: '85', format: 'number', verified: false },
        ],
      }),
    ];

    exportEEAItemsToCSV(items);

    const csv = mocks.getCSV();
    const dataLine = csv.split('\n')[1];

    expect(dataLine).toContain('John Smith');
    expect(dataLine).not.toContain("'John Smith");
    expect(dataLine).toContain('85');
    expect(dataLine).not.toContain("'85");
  });

  // 9. Filename -- custom vs default
  it('uses a custom filename when provided, otherwise falls back to date-based default', () => {
    const items: EEAWebsetItem[] = [makeItem()];

    // With custom filename
    exportEEAItemsToCSV(items, 'my-export.csv');
    expect(mocks.mockLink.download).toBe('my-export.csv');

    // Without custom filename -- falls back to date-based pattern
    exportEEAItemsToCSV(items);
    const today = new Date().toISOString().slice(0, 10);
    expect(mocks.mockLink.download).toBe(`eea-candidates-${today}.csv`);
  });
});
