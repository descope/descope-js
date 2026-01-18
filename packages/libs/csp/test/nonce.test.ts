import { generateNonce } from '../src/nonce';

describe('generateNonce', () => {
  it('should generate a base64 nonce by default', () => {
    const nonce = generateNonce();

    expect(nonce).toBeDefined();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('should generate different nonces on each call', () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    expect(nonce1).not.toBe(nonce2);
  });

  it('should generate base64 nonce with correct length', () => {
    const nonce = generateNonce({ length: 32, encoding: 'base64' });

    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should generate hex nonce when specified', () => {
    const nonce = generateNonce({ encoding: 'hex' });

    expect(nonce).toMatch(/^[0-9a-f]+$/);
  });

  it('should respect custom length', () => {
    const nonce16 = generateNonce({ length: 16, encoding: 'hex' });
    const nonce32 = generateNonce({ length: 32, encoding: 'hex' });

    expect(nonce16.length).toBe(32);
    expect(nonce32.length).toBe(64);
  });

  it('should be cryptographically random', () => {
    const nonces = new Set();

    for (let i = 0; i < 100; i++) {
      nonces.add(generateNonce());
    }

    expect(nonces.size).toBe(100);
  });
});
