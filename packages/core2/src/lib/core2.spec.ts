import { core2 } from './core2';

describe('core2', () => {
  it('should work', () => {
    expect(core2()).toContain('core2_');
    expect(core2()).toContain('core_');
  });
});
