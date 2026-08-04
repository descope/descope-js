import { createUserSdk } from '../src/lib/widget/api/sdk/createUserSdk';
import { HttpClient, SearchUsersConfig } from '../src/lib/widget/api/types';

// A minimal httpClient whose post() records the body it was called with and
// returns an empty user list.
const makeHttpClient = () => {
  const post = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify({ users: [] }),
  });
  return { post } as unknown as HttpClient & { post: jest.Mock };
};

describe('createUserSdk.search', () => {
  it('forwards every SearchUsersConfig field to the POST body', async () => {
    const httpClient = makeHttpClient();
    const sdk = createUserSdk({ httpClient, tenant: 't1', mock: false });

    // The six boolean fields are the ones a boolean filter column emits; if
    // search() drops them, a "Verified email = true" filter silently no-ops.
    const config: SearchUsersConfig = {
      statuses: ['enabled'],
      verifiedEmail: true,
      verifiedPhone: false,
      password: true,
      totp: false,
      webauthn: true,
      scim: false,
    };

    await sdk.search(config);

    const body = httpClient.post.mock.calls[0][1];
    expect(body).toMatchObject(config);
  });
});
