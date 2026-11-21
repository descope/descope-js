// @ts-ignore
// We run build before test, so we can import from dist
import Descope from '../dist/index.umd.js';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('umd sdk', () => {
  it('should export sdk', async () => {
    expect(Descope).toBeDefined();
    expect(Descope).toBeInstanceOf(Function);
    expect(() => Descope({ projectId: 'pid' })).not.toThrow();
  });

  it('should export constants', () => {
    expect(Descope['SESSION_TOKEN_KEY']).toBeDefined();
    expect(Descope['REFRESH_TOKEN_KEY']).toBeDefined();
  });

  it('should export last user helpers', () => {
    expect(Descope['getLastUserLoginId']).toBeInstanceOf(Function);
    expect(Descope['getLastUserDisplayName']).toBeInstanceOf(Function);
    expect(Descope['setLastUserLoginId']).toBeInstanceOf(Function);
    expect(Descope['setLastUserDisplayName']).toBeInstanceOf(Function);
    expect(Descope['removeLastUserLoginId']).toBeInstanceOf(Function);
    expect(Descope['removeLastUserDisplayName']).toBeInstanceOf(Function);
  });
});
