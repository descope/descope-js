import { getSSOConfigurations } from '../src/lib/widget/state/selectors';
import { State } from '../src/lib/widget/state/types';

const buildState = (
  ssoIdToAuthenticationOnly?: Record<string, boolean>,
): State =>
  ({
    tenant: {
      data: {
        id: 'tenant-1',
        name: 'Test Tenant',
        authType: 'saml',
        additionalSSOConfigs: [
          { ssoId: 'verify', name: 'Verification', authType: 'saml' },
          { ssoId: 'workforce', name: 'Workforce', authType: 'saml' },
        ],
      },
    },
    tenantAdminLinkSSO: {
      data: {
        defaultLink: 'https://example.test/sso/setup',
        ssoIdToLink: {
          verify: 'https://example.test/sso/setup?ssoId=verify',
          workforce: 'https://example.test/sso/setup?ssoId=workforce',
        },
        ssoIdToAuthenticationOnly,
      },
    },
  }) as unknown as State;

describe('getSSOConfigurations', () => {
  it('marks only the connections the server reported', () => {
    const configs = getSSOConfigurations(buildState({ verify: true }));

    expect(configs.find((c) => c.id === 'verify')?.authOnly).toBe(true);
    expect(configs.find((c) => c.id === 'workforce')?.authOnly).toBe(false);
  });

  // The default connection owns no entry in the wrapper map, so the server reports it under the
  // reserved id rather than under an empty string.
  it('marks the default connection from the reserved id', () => {
    const configs = getSSOConfigurations(buildState({ default_ssoid: true }));

    expect(configs.find((c) => c.isDefault)?.authOnly).toBe(true);
  });

  // An older server does not send the map at all, and that must read as "not classified" rather
  // than break the list.
  it('treats a missing map as nothing classified', () => {
    const configs = getSSOConfigurations(buildState(undefined));

    expect(configs).toHaveLength(3);
    expect(configs.every((c) => c.authOnly === false)).toBe(true);
  });
});

// reselect compares input-selector results by identity, so an absent map must come back as the same
// object each time or the list recomputes on every unrelated store update.
describe('getSSOConfigurations memoization', () => {
  it('returns the same array across an unrelated store update', () => {
    const before = buildState(undefined);
    // An unrelated update hands the selector a new state object while every slice it reads keeps
    // its identity. Passing the same object twice would only exercise reselect's argument cache
    // and pass even when the input selector allocates.
    const after = {
      ...before,
      me: { data: { userId: 'u-1' } },
    } as unknown as State;

    expect(getSSOConfigurations(after)).toBe(getSSOConfigurations(before));
  });
});
