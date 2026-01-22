import { decodeJWT } from '../src';

describe('helpers', () => {
  describe('decodeJWT', () => {
    it('should decode a valid JWT token', () => {
      // Valid JWT: header.payload.signature
      // Payload: {"sub":"1234567890","name":"John Doe","dct":"tenant123","iat":1516239022}
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZGN0IjoidGVuYW50MTIzIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const decoded = decodeJWT(validToken);

      expect(decoded).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        dct: 'tenant123',
        iat: 1516239022,
      });
    });

    it('should handle JWT without dct claim', () => {
      // Payload: {"sub":"1234567890","name":"Jane Doe","iat":1516239022}
      const tokenWithoutDct =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const decoded = decodeJWT(tokenWithoutDct);

      expect(decoded).toEqual({
        sub: '1234567890',
        name: 'Jane Doe',
        iat: 1516239022,
      });
      expect(decoded.dct).toBeUndefined();
    });

    it('should return null for invalid JWT', () => {
      const invalidToken = 'invalid.token.format';
      const decoded = decodeJWT(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should return null for malformed JWT', () => {
      const malformedToken = 'not-a-jwt';
      const decoded = decodeJWT(malformedToken);
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const emptyToken = '';
      const decoded = decodeJWT(emptyToken);
      expect(decoded).toBeNull();
    });
  });
});
