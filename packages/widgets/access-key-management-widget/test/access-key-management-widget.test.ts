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

// svg imports map to fileMock; the notifications read the icons as elements
jest.mock('./config/fileMock', () => () => document.createElement('span'));

const themeContent = {};
const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

// jsdom has no CSSStyleSheet.replaceSync, which injectStyleMixin calls from the
// element constructor. Same stub the web-component tests use.
global.CSSStyleSheet.prototype.replaceSync = jest.fn();

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
    delete (globalThis as any).DescopeUI;
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
      const { id } = mockAccessKeys.keys[0];
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

  describe('mock sdk', () => {
    it('search returns keys made by create, ahead of the static keys', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, true);
      const { key } = await sdk.accesskey.create({
        name: 'Mock Created Key',
        expiration: '30',
        roleNames: [],
        userId: '',
        permittedIps: [],
      });

      const all = await sdk.accesskey.search({ text: '', sort: [] });
      expect(all[0].id).toBe(key.id);
      expect(all.length).toBeGreaterThan(1);

      const filtered = await sdk.accesskey.search({
        text: 'access key 1',
        sort: [],
      });
      expect(filtered.map((k) => k.id)).not.toContain(key.id);
    });

    it('search keeps the status set by activate / deactivate', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, true);
      const getStatus = async (id: string) =>
        (await sdk.accesskey.search({ text: '', sort: [] })).find(
          (k) => k.id === id,
        )?.status;

      await sdk.accesskey.deactivate(['access-key-id-2']);
      expect(await getStatus('access-key-id-2')).toBe('inactive');
      expect(await getStatus('access-key-id-3')).toBe('active');

      await sdk.accesskey.activate(['access-key-id-2']);
      expect(await getStatus('access-key-id-2')).toBe('active');
    });

    it('search leaves out keys removed by deleteBatch', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, true);
      const { key } = await sdk.accesskey.create({
        name: 'Mock Deleted Key',
        expiration: '30',
        roleNames: [],
        userId: '',
        permittedIps: [],
      });
      const getIds = async () =>
        (await sdk.accesskey.search({ text: '', sort: [] })).map((k) => k.id);

      await sdk.accesskey.deleteBatch([key.id, 'access-key-id-9']);
      await sdk.accesskey.deactivate(['access-key-id-8']);

      const ids = await getIds();
      expect(ids).not.toContain(key.id);
      expect(ids).not.toContain('access-key-id-9');
      expect(ids).toContain('access-key-id-8');
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
      createdAccessKeyId: null,
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
      createdAccessKeyId: null,
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

  const okRes = (body: unknown) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

  const errorRes = {
    ok: false,
    status: 400,
    text: () => Promise.resolve(JSON.stringify({ errorDescription: 'boom' })),
  };

  const getPostCalls = (apiPath: string) =>
    mockHttpClient.post.mock.calls.filter(([path]) => path === apiPath).length;

  const getSearchCalls = () => getPostCalls(apiPaths.accesskey.search);

  // mounts the widget and waits for the given modal and the first list load
  const mountWidget = async (modalName: string) => {
    // DescopeUI is not loaded in jsdom; an empty object skips loading
    // the components instead of injecting a script
    (globalThis as any).DescopeUI = {};
    document.body.innerHTML = `<descope-access-key-management-widget project-id="${mockProjectId}" tenant="${mockTenant}" widget-id="wid"></descope-access-key-management-widget>`;
    const widget: any = document.querySelector(
      'descope-access-key-management-widget',
    );

    await waitFor(
      () =>
        expect(
          widget[modalName]?.ele?.querySelector('[data-id="modal-submit"]'),
        ).toBeTruthy(),
      { timeout: 5000 },
    );
    await waitFor(() => expect(getSearchCalls()).toBe(1));
    await waitFor(() =>
      expect(widget.state.accessKeysList.loading).toBe(false),
    );

    return widget;
  };

  // lets a click handler finish after its request resolves
  const flush = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  describe('create access key', () => {
    const getCreateCalls = () => getPostCalls(apiPaths.accesskey.create);

    // mounts the widget and clicks the create modal's submit button
    const submitCreate = async () => {
      const widget = await mountWidget('createAccessKeyModal');

      // the form inputs are not real inputs in jsdom, so they cannot validate
      jest.spyOn(widget, 'validateForm').mockReturnValue(true);
      widget.setFormData(widget.createAccessKeyModal.ele, {
        name: mockNewAccessKey.name,
        expiration: mockNewAccessKey.expiration,
      });

      widget.createAccessKeyModal.ele
        .querySelector('[data-id="modal-submit"]')
        .click();

      await waitFor(() => expect(getCreateCalls()).toBe(1));
      await waitFor(() =>
        expect(widget.state.createAccessKey.loading).toBe(false),
      );
      await flush();
    };

    it('reloads the list after a successful create', async () => {
      mockHttpClient.post.mockImplementation((path: string) =>
        Promise.resolve(
          path === apiPaths.accesskey.create
            ? okRes({ key: mockAccessKeys.keys[0], cleartext: 'secret' })
            : okRes({ keys: mockAccessKeys.keys }),
        ),
      );

      await submitCreate();

      await waitFor(() => expect(getSearchCalls()).toBe(2));
    });

    const createdKey = { ...mockAccessKeys.keys[0], id: 'new-id', name: 'New' };

    // the search returns the keys without the created key until it is created
    const mockSearchAfterCreate = (keysAfterCreate: (typeof createdKey)[]) => {
      let created = false;
      mockHttpClient.post.mockImplementation((path: string) => {
        if (path === apiPaths.accesskey.create) {
          created = true;
          return Promise.resolve(
            okRes({ key: createdKey, cleartext: 'secret' }),
          );
        }
        return Promise.resolve(
          okRes({ keys: created ? keysAfterCreate : mockAccessKeys.keys }),
        );
      });
    };

    const getListState = () =>
      (document.querySelector('descope-access-key-management-widget') as any)
        .state.accessKeysList;

    const getListIds = () =>
      getListState().data.map((k: { id: string }) => k.id);

    it('shows the created key first when the reload returns it', async () => {
      mockSearchAfterCreate([...mockAccessKeys.keys, createdKey]);

      await submitCreate();

      await waitFor(() => expect(getSearchCalls()).toBe(2));
      await waitFor(() =>
        expect(getListIds()).toEqual([
          'new-id',
          ...mockAccessKeys.keys.map((k) => k.id),
        ]),
      );
    });

    it('does not show the created key when the reload does not return it', async () => {
      mockSearchAfterCreate(mockAccessKeys.keys);

      await submitCreate();

      await waitFor(() => expect(getSearchCalls()).toBe(2));
      await waitFor(() => expect(getListState().loading).toBe(false));
      expect(getListIds()).toEqual(mockAccessKeys.keys.map((k) => k.id));
    });

    it('does not pin the created key on a later search when the reload fails', async () => {
      const serverKeys = [...mockAccessKeys.keys, createdKey];
      let created = false;
      let searchesAfterCreate = 0;
      mockHttpClient.post.mockImplementation((path: string) => {
        if (path === apiPaths.accesskey.create) {
          created = true;
          return Promise.resolve(
            okRes({ key: createdKey, cleartext: 'secret' }),
          );
        }
        if (!created) {
          return Promise.resolve(okRes({ keys: mockAccessKeys.keys }));
        }
        searchesAfterCreate += 1;
        // the reload right after the create fails, the next search works
        return Promise.resolve(
          searchesAfterCreate === 1 ? errorRes : okRes({ keys: serverKeys }),
        );
      });

      await submitCreate();

      await waitFor(() => expect(getSearchCalls()).toBe(2));
      await waitFor(() => expect(getListState().error).toBeTruthy());

      const widget: any = document.querySelector(
        'descope-access-key-management-widget',
      );
      await widget.actions.searchAccessKeys();

      expect(getSearchCalls()).toBe(3);
      expect(getListIds()).toEqual(serverKeys.map((k) => k.id));
    });

    it('does not reload the list when the create fails', async () => {
      mockHttpClient.post.mockImplementation((path: string) =>
        Promise.resolve(
          path === apiPaths.accesskey.create
            ? errorRes
            : okRes({ keys: mockAccessKeys.keys }),
        ),
      );

      await submitCreate();

      expect(getSearchCalls()).toBe(1);
    });
  });

  describe('activate / deactivate access keys', () => {
    // clicks the modal's submit button with every listed key selected
    const submitStatusChange = async (
      modalName: string,
      apiPath: string,
      res: unknown,
    ) => {
      mockHttpClient.post.mockImplementation((path: string) =>
        Promise.resolve(
          path === apiPath ? res : okRes({ keys: mockAccessKeys.keys }),
        ),
      );

      const widget = await mountWidget(modalName);
      widget.actions.setSelectedAccessKeysIds(
        mockAccessKeys.keys.map((k) => k.id),
      );

      widget[modalName].ele.querySelector('[data-id="modal-submit"]').click();

      await waitFor(() => expect(getPostCalls(apiPath)).toBe(1));
      await flush();
    };

    describe.each([
      ['activate', 'activateAccessKeysModal', apiPaths.accesskey.activate],
      [
        'deactivate',
        'deactivateAccessKeysModal',
        apiPaths.accesskey.deactivate,
      ],
    ])('%s', (_, modalName, apiPath) => {
      it('reloads the list after a success', async () => {
        await submitStatusChange(modalName, apiPath, okRes({}));

        await waitFor(() => expect(getSearchCalls()).toBe(2));
      });

      it('does not reload the list after a failure', async () => {
        await submitStatusChange(modalName, apiPath, errorRes);

        expect(getSearchCalls()).toBe(1);
      });
    });
  });
});
