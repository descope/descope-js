import { isTokenExpired } from '../src/enhancers/withPersistTokens/helpers';

describe('token helpers', () => {
  it('should successfully check token expiration', async () => {
    const pastToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.AgNLCIRwkhE9zEvARcUz3dhxFH6MvrZVXrWEfm7X9Xs';
    var isExpired = isTokenExpired(pastToken);
    expect(isExpired).toBeTruthy();

    const futureToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo0ODY4NDA3MTQ1fQ.mLElg5aFViF_R87XRMKVVw6MUE4DJp5fMA62MuVDO4Q';
    isExpired = isTokenExpired(futureToken);
    expect(isExpired).toBeFalsy();

    const missingExp =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    isExpired = isTokenExpired(missingExp);
    expect(isExpired).toBeTruthy();

    isExpired = isTokenExpired();
    expect(isExpired).toBeTruthy();
  });
});
