import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { pluralize } from '@descope/sdk-helpers';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { mockAccessKeys, mockNewAccessKey } from './mocks/mockAccessKeys';
import { createSdk } from '../src/lib/widget/api/sdk';
import {
  getCanModifyAccessKeys,
  getCanChangeAccessKeysStatus,
  getCanRotateAccessKey,
  getHasSelectedExpiredAccessKeys,
} from '../src/lib/widget/state/selectors';
import { State } from '../src/lib/widget/state/types';
import '../src/lib/index';
import rootMock from './mocks/rootMock';
import createAccessKeyModalMock from './mocks/createAccessKeyModalMock';
import createdAccessKeyModalMock from './mocks/createdAccessKeyModalMock';
import deleteAccessKeyModalMock from './mocks/deleteAccessKeyModalMock';
import activateAccessKeyModalMock from './mocks/activateAccessKeyModalMock';
import deactivateAccessKeyModalMock from './mocks/deactivateAccessKeyModalMock';
import rotateAccessKeyModalMock from './mocks/rotateAccessKeyModalMock';
import rotatedAccessKeyModalMock from './mocks/rotatedAccessKeyModalMock';

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
        json: () => Promise.resolve({ keys: mockAccessKeys.keys }),
        text: () =>
          Promise.resolve(JSON.stringify({ keys: mockAccessKeys.keys })),
      }),
    ),
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({ httpClient: mockHttpClient })),
}));

jest.mock('../src/lib/widget/api/sdk/createAccessKeySdk', () => {
  const actualModule = jest.requireActual(
    '../src/lib/widget/api/sdk/createAccessKeySdk',
  );
  return {
    __esModule: true,
    createAccessKeySdk: jest.fn((props) => {
      actualModule.createAccessKeySdk(props);
      return actualModule.createAccessKeySdk(props);
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

describe('access-key-management-widget', () => {
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
        case url.endsWith('create-access-key-modal.html'): {
          return { ...res, text: () => createAccessKeyModalMock };
        }
        case url.endsWith('created-access-key-modal.html'): {
          return { ...res, text: () => createdAccessKeyModalMock };
        }
        case url.endsWith('activate-access-keys-modal.html'): {
          return { ...res, text: () => activateAccessKeyModalMock };
        }
        case url.endsWith('deactivate-access-keys-modal.html'): {
          return { ...res, text: () => deactivateAccessKeyModalMock };
        }
        case url.endsWith('delete-access-keys-modal.html'): {
          return { ...res, text: () => deleteAccessKeyModalMock };
        }
        case url.endsWith('rotate-access-key-modal.html'): {
          return { ...res, text: () => rotateAccessKeyModalMock };
        }
        case url.endsWith('rotated-access-key-modal.html'): {
          return { ...res, text: () => rotatedAccessKeyModalMock };
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

  describe('sdk', () => {
    it('search', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const result = await sdk.accesskey.search({});

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.accesskey.search,
          {
            limit: 10000,
            page: undefined,
          },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );

      expect(result[0].id).toEqual(mockAccessKeys.keys[0]['id']);
      expect(result[1].id).toEqual(mockAccessKeys.keys[1]['id']);
    });

    it('deleteBatch', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const ids = [mockAccessKeys.keys[0]['id'], mockAccessKeys.keys[1]['id']];

      await sdk.accesskey.deleteBatch(ids);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.accesskey.deleteBatch,
          { ids },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('activate', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const ids = [mockAccessKeys.keys[0]['id'], mockAccessKeys.keys[1]['id']];

      await sdk.accesskey.activate(ids);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.accesskey.activate,
          { ids },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('deactivate', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const ids = [mockAccessKeys.keys[0]['id'], mockAccessKeys.keys[1]['id']];

      await sdk.accesskey.deactivate(ids);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.accesskey.deactivate,
          { ids },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('create', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);

      await sdk.accesskey.create(mockNewAccessKey);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.accesskey.create,
          {
            name: mockNewAccessKey.name,
            userId: mockNewAccessKey.userId,
            roleNames: mockNewAccessKey.roleNames,
            permittedIps: mockNewAccessKey.permittedIps,
            expireTime: 0,
          },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('rotate', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const id = mockAccessKeys.keys[0]['id'];
      const rotateResponse = { cleartext: 'rotated-secret', key: { id } };
      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(rotateResponse),
        text: () => Promise.resolve(JSON.stringify(rotateResponse)),
      });

      await sdk.accesskey.rotate({ id });

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.accesskey.rotate,
          { id },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });
  });

  describe('utils', () => {
    it('should pluralize messages', () => {
      expect(
        pluralize(1)`${['', 2]}${['A', 'a']}ccess key${[
          '',
          's',
        ]} deleted successfully`,
      ).toEqual('Access key deleted successfully');
      expect(
        pluralize(2)`${['', 2]} ${['A', 'a']}ccess key${[
          '',
          's',
        ]} deleted successfully`,
      ).toEqual('2 access keys deleted successfully');
    });
  });

  describe('selectors', () => {
    const baseState: State = {
      accessKeysList: { data: [], loading: false, error: null },
      createAccessKey: { loading: false, error: null },
      activateAccessKey: { loading: false, error: null },
      deactivateAccessKey: { loading: false, error: null },
      deleteAccessKey: { loading: false, error: null },
      rotateAccessKey: { loading: false, error: null },
      tenantRoles: { loading: false, error: null, data: [] },
      searchParams: { text: '', sort: [] },
      selectedAccessKeysIds: [],
      notifications: [],
    };

    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    const futureTime = Math.floor(Date.now() / 1000) + 3600;

    const makeKey = (overrides: Partial<(typeof mockAccessKeys.keys)[0]>) => ({
      id: '1',
      name: 'Key 1',
      clientId: 'c1',
      createdBy: 'user',
      roleNames: [],
      permittedIps: [],
      createdTime: pastTime,
      expireTime: futureTime,
      status: 'active',
      editable: true,
      boundUserId: 'u1',
      ...overrides,
    });

    it('getCanChangeAccessKeysStatus should return true for selected editable non-expired keys', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', expireTime: futureTime })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanModifyAccessKeys(state)).toBe(true);
      expect(getHasSelectedExpiredAccessKeys(state)).toBe(false);
      expect(getCanChangeAccessKeysStatus(state)).toBe(true);
    });

    it('getCanChangeAccessKeysStatus should return false for expired keys', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', expireTime: pastTime })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanModifyAccessKeys(state)).toBe(true);
      expect(getHasSelectedExpiredAccessKeys(state)).toBe(true);
      expect(getCanChangeAccessKeysStatus(state)).toBe(false);
    });

    it('getCanChangeAccessKeysStatus should return false when mix of expired and non-expired keys selected', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [
            makeKey({ id: '1', expireTime: futureTime }),
            makeKey({ id: '2', expireTime: pastTime }),
          ],
        },
        selectedAccessKeysIds: ['1', '2'],
      };

      expect(getCanModifyAccessKeys(state)).toBe(true);
      expect(getHasSelectedExpiredAccessKeys(state)).toBe(true);
      expect(getCanChangeAccessKeysStatus(state)).toBe(false);
    });

    it('getCanModifyAccessKeys should still return true for expired keys (for delete)', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', expireTime: pastTime })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanModifyAccessKeys(state)).toBe(true);
    });

    it('getCanChangeAccessKeysStatus should return false for non-editable keys', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', editable: false })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanChangeAccessKeysStatus(state)).toBe(false);
    });

    it('getCanChangeAccessKeysStatus should return false when no keys selected', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1' })],
        },
        selectedAccessKeysIds: [],
      };

      expect(getCanChangeAccessKeysStatus(state)).toBe(false);
    });

    it('getCanRotateAccessKey should return true for single active non-expired editable selected', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1' })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanRotateAccessKey(state)).toBe(true);
    });

    it('getCanRotateAccessKey should return false when no keys selected', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1' })],
        },
        selectedAccessKeysIds: [],
      };

      expect(getCanRotateAccessKey(state)).toBe(false);
    });

    it('getCanRotateAccessKey should return false when multiple keys are selected', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1' }), makeKey({ id: '2' })],
        },
        selectedAccessKeysIds: ['1', '2'],
      };

      expect(getCanRotateAccessKey(state)).toBe(false);
    });

    it('getCanRotateAccessKey should return false for a single expired key', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', expireTime: pastTime })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanRotateAccessKey(state)).toBe(false);
    });

    it('getCanRotateAccessKey should return false for a single inactive (status !== "active") key', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', status: 'inactive' })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanRotateAccessKey(state)).toBe(false);
    });

    it('getCanRotateAccessKey should return false for a single non-editable key', () => {
      const state: State = {
        ...baseState,
        accessKeysList: {
          ...baseState.accessKeysList,
          data: [makeKey({ id: '1', editable: false })],
        },
        selectedAccessKeysIds: ['1'],
      };

      expect(getCanRotateAccessKey(state)).toBe(false);
    });
  });

  describe('rotateAccessKey reducer', () => {
    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    const futureTime = Math.floor(Date.now() / 1000) + 3600;

    const makeKey = (overrides: Partial<(typeof mockAccessKeys.keys)[0]>) => ({
      id: '1',
      name: 'Key 1',
      clientId: 'c1',
      createdBy: 'user',
      roleNames: [],
      permittedIps: [],
      createdTime: pastTime,
      expireTime: futureTime,
      status: 'active',
      editable: true,
      boundUserId: 'u1',
      ...overrides,
    });

    const baseState: State = {
      accessKeysList: { data: [], loading: false, error: null },
      createAccessKey: { loading: false, error: null },
      activateAccessKey: { loading: false, error: null },
      deactivateAccessKey: { loading: false, error: null },
      deleteAccessKey: { loading: false, error: null },
      rotateAccessKey: { loading: false, error: null },
      tenantRoles: { loading: false, error: null, data: [] },
      searchParams: { text: '', sort: [] },
      selectedAccessKeysIds: [],
      notifications: [],
    };

    // The action and reducer are wired via Redux Toolkit + the buildAsyncReducer
    // helper. Importing them dynamically here mirrors how the widget runtime composes
    // them, so the test catches breakage in the wiring (not just the action shape).
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const {
      rotateAccessKey,
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    } = require('../src/lib/widget/state/asyncActions/rotateAccessKey');

    const applyAction = (initial: State, action: any): State => {
      // Each reducer registers cases on a builder; we re-run those on a fresh
      // builder that captures into a map keyed by action type.
      const cases: Record<string, any> = {};
      rotateAccessKey.reducer({
        addCase: (matcher: any, fn: any) => {
          cases[matcher.type] = fn;
          return { addCase: cases.addCase };
        },
      });
      const fn = cases[action.type];
      // Mutate-in-place via Redux Toolkit's pattern — for the test we deep-clone
      // the state to avoid leaking between assertions.
      const next: State = JSON.parse(JSON.stringify(initial));
      if (fn) fn(next, action);
      return next;
    };

    it('onFulfilled replaces the matching key in accessKeysList.data with the response key', () => {
      const oldKey = makeKey({ id: '1', name: 'old-name', clientId: 'c-old' });
      const newKey = { ...oldKey, name: 'new-name', clientId: 'c-new' };
      const initial: State = {
        ...baseState,
        accessKeysList: { ...baseState.accessKeysList, data: [oldKey] },
      };

      const next = applyAction(initial, {
        type: rotateAccessKey.action.fulfilled.type,
        payload: { key: newKey, cleartext: 'rotated-secret' },
        meta: { arg: { id: '1' }, requestId: 'r1' },
      });

      expect(next.accessKeysList.data).toHaveLength(1);
      expect(next.accessKeysList.data[0].name).toBe('new-name');
      expect(next.accessKeysList.data[0].clientId).toBe('c-new');
      const successNotifications = next.notifications.filter(
        (n) => n.type === 'success',
      );
      expect(successNotifications).toHaveLength(1);
      expect(successNotifications[0].msg).toBe(
        'Access key rotated successfully',
      );
    });

    it('onFulfilled is a no-op for the list when the response id is not in the list', () => {
      const someKey = makeKey({ id: '2', name: 'untouched' });
      const initial: State = {
        ...baseState,
        accessKeysList: { ...baseState.accessKeysList, data: [someKey] },
      };

      const next = applyAction(initial, {
        type: rotateAccessKey.action.fulfilled.type,
        payload: { key: { ...someKey, id: '999' }, cleartext: 's' },
        meta: { arg: { id: '999' }, requestId: 'r1' },
      });

      expect(next.accessKeysList.data).toEqual([someKey]);
    });

    it('onRejected pushes an error notification and does NOT mutate accessKeysList', () => {
      const key = makeKey({ id: '1', name: 'kept-as-is' });
      const initial: State = {
        ...baseState,
        accessKeysList: { ...baseState.accessKeysList, data: [key] },
      };

      const next = applyAction(initial, {
        type: rotateAccessKey.action.rejected.type,
        payload: undefined,
        error: { message: 'boom' },
        meta: { arg: { id: '1' }, requestId: 'r1' },
      });

      expect(next.accessKeysList.data).toEqual([key]);
      const errorNotifications = next.notifications.filter(
        (n) => n.type === 'error',
      );
      expect(errorNotifications).toHaveLength(1);
      expect(errorNotifications[0].msg).toContain(
        'Failed to rotate access key',
      );
    });
  });
});
