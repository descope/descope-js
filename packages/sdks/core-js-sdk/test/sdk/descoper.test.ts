import {
  Descoper,
  DescoperCreate,
  DescoperCreateResponse,
  DescoperGetResponse,
  DescoperListResponse,
  DescoperRole,
  DescoperUpdateResponse,
  SdkResponse,
} from '../../src';
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

const mockDescoper: Descoper = {
  id: 'U2111111111111111111111111',
  loginIds: ['user1@example.com'],
  attributes: {
    displayName: 'Test User',
    email: 'user1@example.com',
    phone: '+123456',
  },
  rbac: {
    isCompanyAdmin: false,
    tags: [],
    projects: [
      {
        projectIds: ['P2111111111111111111111111'],
        role: 'admin',
      },
    ],
  },
  status: 'invited',
};

const mockCreateResponse: DescoperCreateResponse = {
  descopers: [mockDescoper],
  total: 1,
};

const mockGetResponse: DescoperGetResponse = {
  descoper: mockDescoper,
};

const mockUpdateResponse: DescoperUpdateResponse = {
  descoper: {
    ...mockDescoper,
    attributes: {
      ...mockDescoper.attributes,
      displayName: 'Updated User',
    },
    rbac: {
      isCompanyAdmin: true,
      tags: [],
      projects: [],
    },
  },
};

const mockListResponse: DescoperListResponse = {
  descopers: [
    mockDescoper,
    {
      id: 'U2222222222222222222222222',
      loginIds: ['user2@example.com'],
      attributes: {
        displayName: 'Admin User',
        email: 'admin@example.com',
      },
      rbac: {
        isCompanyAdmin: true,
        tags: [],
        projects: [],
      },
      status: 'enabled',
    },
  ],
  total: 2,
};

describe('descoper', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });

  describe('create', () => {
    it('should throw an error when descopers is not an array', () => {
      expect(() => (sdk.descoper.create as any)('not-an-array')).toThrow(
        '"descopers" must be an array',
      );
    });

    it('should send the correct request', () => {
      const httpResponse = {
        ok: true,
        json: () => mockCreateResponse,
        clone: () => ({
          json: () => Promise.resolve(mockCreateResponse),
        }),
        status: 200,
      };
      mockHttpClient.put.mockResolvedValue(httpResponse);

      const descopers: DescoperCreate[] = [
        {
          loginId: 'user1@example.com',
          attributes: {
            displayName: 'Test User',
            email: 'user1@example.com',
            phone: '+123456',
          },
          rbac: {
            projects: [
              {
                projectIds: ['P2111111111111111111111111'],
                role: 'admin' as DescoperRole,
              },
            ],
          },
        },
      ];
      sdk.descoper.create(descopers);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        apiPaths.descoper.create,
        { descopers },
      );
    });

    it('should return the correct response', async () => {
      const httpResponse = {
        ok: true,
        json: () => mockCreateResponse,
        clone: () => ({
          json: () => Promise.resolve(mockCreateResponse),
        }),
        status: 200,
      };
      mockHttpClient.put.mockResolvedValue(httpResponse);

      const resp: SdkResponse<DescoperCreateResponse> =
        await sdk.descoper.create([
          {
            loginId: 'user1@example.com',
          },
        ]);

      expect(resp).toEqual({
        code: 200,
        data: mockCreateResponse,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('update', () => {
    it('should throw an error when id is not a string', () => {
      expect(() => (sdk.descoper.update as any)(123)).toThrow(
        '"id" must be a string',
      );
    });

    it('should throw an error when id is empty', () => {
      expect(() => sdk.descoper.update('')).toThrow('"id" must not be empty');
    });

    it('should send the correct request', () => {
      const httpResponse = {
        ok: true,
        json: () => mockUpdateResponse,
        clone: () => ({
          json: () => Promise.resolve(mockUpdateResponse),
        }),
        status: 200,
      };
      mockHttpClient.patch.mockResolvedValue(httpResponse);

      const id = 'U2111111111111111111111111';
      const attributes = { displayName: 'Updated User' };
      const rbac = { isCompanyAdmin: true };

      sdk.descoper.update(id, attributes, rbac);

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        apiPaths.descoper.update,
        { id, attributes, rbac },
      );
    });

    it('should return the correct response', async () => {
      const httpResponse = {
        ok: true,
        json: () => mockUpdateResponse,
        clone: () => ({
          json: () => Promise.resolve(mockUpdateResponse),
        }),
        status: 200,
      };
      mockHttpClient.patch.mockResolvedValue(httpResponse);

      const resp: SdkResponse<DescoperUpdateResponse> =
        await sdk.descoper.update('U2111111111111111111111111', undefined, {
          isCompanyAdmin: true,
        });

      expect(resp).toEqual({
        code: 200,
        data: mockUpdateResponse,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('get', () => {
    it('should throw an error when id is not a string', () => {
      expect(() => (sdk.descoper.get as any)(123)).toThrow(
        '"id" must be a string',
      );
    });

    it('should throw an error when id is empty', () => {
      expect(() => sdk.descoper.get('')).toThrow('"id" must not be empty');
    });

    it('should send the correct request', () => {
      const httpResponse = {
        ok: true,
        json: () => mockGetResponse,
        clone: () => ({
          json: () => Promise.resolve(mockGetResponse),
        }),
        status: 200,
      };
      mockHttpClient.get.mockResolvedValue(httpResponse);

      const id = 'U2111111111111111111111111';
      sdk.descoper.get(id);

      expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.descoper.get, {
        queryParams: { id },
      });
    });

    it('should return the correct response', async () => {
      const httpResponse = {
        ok: true,
        json: () => mockGetResponse,
        clone: () => ({
          json: () => Promise.resolve(mockGetResponse),
        }),
        status: 200,
      };
      mockHttpClient.get.mockResolvedValue(httpResponse);

      const resp: SdkResponse<DescoperGetResponse> = await sdk.descoper.get(
        'U2111111111111111111111111',
      );

      expect(resp).toEqual({
        code: 200,
        data: mockGetResponse,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('delete', () => {
    it('should throw an error when id is not a string', () => {
      expect(() => (sdk.descoper.delete as any)(123)).toThrow(
        '"id" must be a string',
      );
    });

    it('should throw an error when id is empty', () => {
      expect(() => sdk.descoper.delete('')).toThrow('"id" must not be empty');
    });

    it('should send the correct request', () => {
      const httpResponse = {
        ok: true,
        json: () => ({}),
        clone: () => ({
          json: () => Promise.resolve({}),
        }),
        status: 200,
      };
      mockHttpClient.delete.mockResolvedValue(httpResponse);

      const id = 'U2111111111111111111111111';
      sdk.descoper.delete(id);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        apiPaths.descoper.delete,
        {
          queryParams: { id },
        },
      );
    });

    it('should return the correct response', async () => {
      const httpResponse = {
        ok: true,
        json: () => ({}),
        clone: () => ({
          json: () => Promise.resolve({}),
        }),
        status: 200,
      };
      mockHttpClient.delete.mockResolvedValue(httpResponse);

      const resp = await sdk.descoper.delete('U2111111111111111111111111');

      expect(resp).toEqual({
        code: 200,
        data: {},
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('list', () => {
    it('should send the correct request without options', () => {
      const httpResponse = {
        ok: true,
        json: () => mockListResponse,
        clone: () => ({
          json: () => Promise.resolve(mockListResponse),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.descoper.list();

      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.descoper.list, {
        options: undefined,
      });
    });

    it('should send the correct request with options', () => {
      const httpResponse = {
        ok: true,
        json: () => mockListResponse,
        clone: () => ({
          json: () => Promise.resolve(mockListResponse),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      const options = {};
      sdk.descoper.list(options);

      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.descoper.list, {
        options,
      });
    });

    it('should return the correct response', async () => {
      const httpResponse = {
        ok: true,
        json: () => mockListResponse,
        clone: () => ({
          json: () => Promise.resolve(mockListResponse),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      const resp: SdkResponse<DescoperListResponse> = await sdk.descoper.list();

      expect(resp).toEqual({
        code: 200,
        data: mockListResponse,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
