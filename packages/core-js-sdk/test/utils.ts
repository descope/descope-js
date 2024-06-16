export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  reset: () =>
    ['get', 'post', 'put', 'delete'].forEach((key) =>
      mockHttpClient[key].mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ body: 'body' }),
        clone: () => ({
          json: () => Promise.resolve({ body: 'body' }),
        }),
        status: 200,
      }),
    ),
  buildUrl: jest.fn(),
};
mockHttpClient.reset();
