import { generateCsv, downloadCsv } from '@descope/sdk-helpers';
import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import { AUDIT_CSV_COLUMNS } from '../src/lib/widget/helpers/csv';
import { mockAudit } from './mocks/mockAudit';
import rootMock from './mocks/rootMock';

const origAppend = document.body.append;

const mockProjectId = 'mockProjectId';
const mockTenant = 'mockTenant';

export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  reset: () =>
    ['post'].forEach((key) =>
      mockHttpClient[key].mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ audits: mockAudit.audit }),
        text: () =>
          Promise.resolve(JSON.stringify({ audits: mockAudit.audit })),
      }),
    ),
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({ httpClient: mockHttpClient })),
}));

jest.mock('../src/lib/widget/api/sdk/createAuditSdk', () => {
  const actualModule = jest.requireActual(
    '../src/lib/widget/api/sdk/createAuditSdk',
  );
  return {
    __esModule: true,
    createAuditSdk: jest.fn((props) => {
      actualModule.createAuditSdk(props);
      return actualModule.createAuditSdk(props);
    }),
  };
});

const themeContent = {};
const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

describe('audit-management-widget', () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      const res = {
        ok: true,
        headers: new Headers({}),
      };

      switch (true) {
        case url.endsWith('theme.json'): {
          return { ...res, json: () => themeContent };
        }
        case url.endsWith('config.json'): {
          return { ...res, json: () => configContent };
        }
        case url.endsWith('root.html'): {
          return { ...res, text: () => rootMock };
        }
        default: {
          return { ok: false };
        }
      }
    });
  });

  afterEach(() => {
    document.getElementsByTagName('head')[0].innerHTML = '';
    document.getElementsByTagName('body')[0].innerHTML = '';
    document.body.append = origAppend;
    mockHttpClient.reset();
  });

  describe('export', () => {
    it('should generate CSV from audit data using AUDIT_CSV_COLUMNS', () => {
      const audits = mockAudit.audit.map((a) => ({
        ...a,
        occurredFormatted: new Date(a.occurred).toLocaleString(),
      }));
      const csv = generateCsv(audits, AUDIT_CSV_COLUMNS);
      const lines = csv.split('\n');

      // header + 3 audit rows
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe(
        'Occurred,User ID,Actor,Login IDs,Remote Address,Type,Action,Device,Method,Geo',
      );
      // verify each row contains the expected audit data
      expect(lines[1]).toContain('User 1');
      expect(lines[1]).toContain('Actor 1');
      expect(lines[1]).toContain('Action 1');
      expect(lines[2]).toContain('User 2');
      expect(lines[3]).toContain('User 3');
    });

    it('should trigger a CSV file download', () => {
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = jest.fn();

      const clickSpy = jest.fn();
      const setAttributeSpy = jest.fn();
      jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        setAttribute: setAttributeSpy,
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
      jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node);
      jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => node);

      const csv = generateCsv(
        [{ occurredFormatted: 'time', userId: 'u1' }],
        AUDIT_CSV_COLUMNS,
      );
      downloadCsv(csv, 'audit_logs_2026-04-11.csv');

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(setAttributeSpy).toHaveBeenCalledWith(
        'download',
        'audit_logs_2026-04-11.csv',
      );
      expect(clickSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      (document.createElement as jest.Mock).mockRestore();
      (document.body.appendChild as jest.Mock).mockRestore();
      (document.body.removeChild as jest.Mock).mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should generate empty CSV when no audit data', () => {
      const csv = generateCsv([], AUDIT_CSV_COLUMNS);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(
        'Occurred,User ID,Actor,Login IDs,Remote Address,Type,Action,Device,Method,Geo',
      );
    });
  });

  describe('sdk', () => {
    it('search', async () => {
      const text = 'aaa';
      const from = new Date().getTime();
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const result = await sdk.audit.search({ text, from });

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.audit.search,
          {
            limit: 10000,
            page: undefined,
            text,
            from,
          },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );

      expect(result[0].actorId).toEqual(mockAudit.audit[0]['actorId']);
      expect(result[1].actorId).toEqual(mockAudit.audit[1]['actorId']);
    });
  });
});
