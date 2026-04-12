import { transformSetCookie } from '../src/httpClient/helpers';

describe('transformSetCookie', () => {
  it('should parse a single cookie without attributes', () => {
    const result = transformSetCookie('DS=session_jwt_value');
    expect(result).toEqual({ DS: 'session_jwt_value' });
  });

  it('should parse a single cookie with attributes', () => {
    const result = transformSetCookie(
      'DS=session_jwt_value; Path=/; HttpOnly; Secure; SameSite=None',
    );
    expect(result).toEqual({ DS: 'session_jwt_value' });
  });

  it('should parse multiple cookies (DS and DSR)', () => {
    const header =
      'DS=session_jwt_value; Path=/; HttpOnly; Secure; SameSite=None, DSR=refresh_jwt_value; Path=/; HttpOnly; Secure; SameSite=None';
    const result = transformSetCookie(header);
    expect(result).toEqual({
      DS: 'session_jwt_value',
      DSR: 'refresh_jwt_value',
    });
  });

  it('should parse multiple cookies with Expires containing commas', () => {
    const header =
      'DS=session_jwt_value; Path=/; Expires=Sun, 10 May 2026 12:00:00 GMT; HttpOnly; Secure; SameSite=None, DSR=refresh_jwt_value; Path=/; Expires=Sun, 10 May 2026 12:00:00 GMT; HttpOnly; Secure; SameSite=None';
    const result = transformSetCookie(header);
    expect(result).toEqual({
      DS: 'session_jwt_value',
      DSR: 'refresh_jwt_value',
    });
  });

  it('should parse a single DSR cookie', () => {
    const result = transformSetCookie(
      'DSR=refresh_jwt_value; Path=/; HttpOnly; Secure; SameSite=None',
    );
    expect(result).toEqual({ DSR: 'refresh_jwt_value' });
  });

  it('should parse cookies with custom names', () => {
    const header =
      'mySession=session_jwt_value; Path=/; HttpOnly; SameSite=None, myRefresh=refresh_jwt_value; Path=/; HttpOnly; SameSite=None';
    const result = transformSetCookie(header);
    expect(result).toEqual({
      mySession: 'session_jwt_value',
      myRefresh: 'refresh_jwt_value',
    });
  });

  it('should skip malformed entries without a name=value pair', () => {
    const result = transformSetCookie('noequals, DS=valid_value');
    expect(result).toEqual({ DS: 'valid_value' });
  });

  it('should return an empty object for an empty string', () => {
    const result = transformSetCookie('');
    expect(result).toEqual({});
  });
});
