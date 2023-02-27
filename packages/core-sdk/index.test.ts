import { runCore } from ".";

describe('core-sdk-test', () => {
  test('test1', async () => {
    const res = runCore('x');
    expect(res).toContain('CORE');
    expect(res).toContain('x');
  });
});