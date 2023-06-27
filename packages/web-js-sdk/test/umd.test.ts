import createSdk from '../src/index.umd';

describe('umd sdk', () => {
  it('should export sdk', async () => {
    expect(createSdk).toBeDefined();
    expect(createSdk).toBeInstanceOf(Function);
    expect(createSdk({ projectId: 'pid' })).not.toThrow();
  });

  it('should export constants', () => {
    expect(createSdk['SESSION_TOKEN_KEY']).toBeDefined();
    expect(createSdk['REFRESH_TOKEN_KEY']).toBeDefined();
  });
});
