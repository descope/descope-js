import { transformStepStateForCustomScreen } from '../../src/lib/helpers';

const build = (screenState: Record<string, any>) =>
  transformStepStateForCustomScreen({ screenState } as any);

describe('transformStepStateForCustomScreen — data', () => {
  it('exposes recovery codes as a plain string[] under data', () => {
    const res = build({
      componentsConfig: {
        componentsDynamicAttrs: {
          '[data-name="recoveryCodes"]': {
            attributes: { data: [{ value: 'A1B2' }, { value: 'C3D4' }] },
          },
        },
      },
    });

    expect(res.data?.recoveryCodes).toEqual(['A1B2', 'C3D4']);
  });

  it('recognizes recovery codes regardless of the selector quote style', () => {
    const res = build({
      componentsConfig: {
        componentsDynamicAttrs: {
          "[data-name='recoveryCodes']": {
            attributes: { data: [{ value: 'X' }] },
          },
        },
      },
    });

    expect(res.data?.recoveryCodes).toEqual(['X']);
  });

  it('recovery codes with a missing/invalid data array does not throw', () => {
    const res = build({
      componentsConfig: {
        componentsDynamicAttrs: {
          '[data-name="recoveryCodes"]': { attributes: {} },
        },
      },
    });

    expect(res.data?.recoveryCodes).toEqual([]);
  });

  it('recognizes and camelCases the outbound app entry', () => {
    const res = build({
      componentsConfig: {
        componentsDynamicAttrs: {
          '[data-name="outboundApp"]': {
            attributes: {
              label: 'Slack',
              'icon-src': 'https://icon',
              'data-descope-outbound-oauth-app-id': 'app-1',
            },
          },
        },
      },
    });

    expect(res.data?.outboundApp).toEqual({
      label: 'Slack',
      iconSrc: 'https://icon',
      appId: 'app-1',
    });
  });

  it('drops unrecognized componentsDynamicAttrs selector entries', () => {
    const res = build({
      componentsConfig: {
        componentsDynamicAttrs: {
          "[data-connector-id='id123']": { attributes: { 'test-attr': 'v' } },
        },
      },
    });

    expect(res.data).toBeUndefined();
  });

  it('renames and normalizes clear-named componentsConfig fields', () => {
    const res = build({
      componentsConfig: {
        newPassword: {
          'data-password-policy-value-minlength': '8',
          'data-password-policy-value-passwordstrength': 'strong',
          'data-password-policy-value-disallowedchars': '$',
          'data-password-policy-value-email': 'true',
          'active-policies': 'a',
          'available-policies': 'b',
        },
        userSelectedTenant: { data: [{ label: 'T', value: 't1' }] },
        userRoles: { data: [{ label: 'R', value: 'r1' }] },
        ssoApplications: { data: [{ label: 'App', value: 'a1' }] },
        sqSetup: { questions: [{ id: 'q1', text: 'Q?' }], count: 1 },
        samlMappings: { options: [{ label: 'M', value: 'm1' }] },
      },
    });

    expect(res.data?.passwordPolicy).toEqual({
      minLength: '8',
      strength: 'strong',
      disallowedChars: '$',
      email: 'true',
      activePolicies: 'a',
      availablePolicies: 'b',
    });
    expect(res.data?.userTenants).toEqual([{ label: 'T', value: 't1' }]);
    expect(res.data?.userRoles).toEqual([{ label: 'R', value: 'r1' }]);
    expect(res.data?.ssoApplications).toEqual([{ label: 'App', value: 'a1' }]);
    expect(res.data?.securityQuestionsSetup).toEqual({
      questions: [{ id: 'q1', text: 'Q?' }],
      count: 1,
    });
    expect(res.data?.samlAttributeMappings).toEqual([
      { label: 'M', value: 'm1' },
    ]);
  });

  it('drops unknown componentsConfig fields (allow-list, not passthrough)', () => {
    const res = build({
      componentsConfig: { someFutureField: { foo: 'bar' } },
    });

    // only allow-listed fields surface; someFutureField is not one, so data is empty
    expect(res.data).toBeUndefined();
  });

  it('drops dynamic-select options — they are not on the allow-list', () => {
    // the backend copies each dynamicSelects entry into componentsConfig[<selectField>]
    // under an arbitrary key. Those keys can't be enumerated in advance, so the
    // allow-list drops them (they were never exposed before this change either).
    const res = build({
      componentsConfig: {
        country: { data: [{ label: 'US', value: 'us' }] },
      },
    });

    expect(res.data).toBeUndefined();
  });

  it('skips internal fields and does not leak componentsConfig at the top level', () => {
    const res = build({
      componentsConfig: {
        riskAssessmentModified: '2026-07-20T00:00:00Z',
        thirdPartyAppApproveScopes: {
          data: [{ id: 's1', desc: 'd', required: true }],
        },
      },
    });

    // riskAssessmentModified is internal — never surfaced
    expect((res.data as any)?.riskAssessmentModified).toBeUndefined();
    // thirdPartyAppApproveScopes is surfaced under data as inboundAppApproveScopes
    expect((res.data as any)?.thirdPartyAppApproveScopes).toBeUndefined();
    expect(res.data?.inboundAppApproveScopes).toEqual([
      { id: 's1', desc: 'd', required: true },
    ]);
    // the raw componentsConfig blob never leaks onto the context
    expect((res as any).componentsConfig).toBeUndefined();
  });

  it('moves top-level screen-data fields under data (not at the top level)', () => {
    const res = build({
      user: { name: 'john' },
      totp: { image: 'img', provisionUrl: 'otpauth://x' },
      notp: { image: 'nimg', redirectUrl: 'https://r' },
      sentTo: { maskedEmail: 'a***@b.com' },
      sso: { acsUrl: 'https://acs' },
      selfProvisionDomains: 'b.com',
      keysInUse: { email: 'a***@b.com' },
      genericForm: { 'form.foo': 'bar' },
      linkId: 'link-1',
    });

    expect(res.data?.totp).toEqual({
      image: 'img',
      provisionUrl: 'otpauth://x',
    });
    expect(res.data?.notp).toEqual({ image: 'nimg', redirectUrl: 'https://r' });
    expect(res.data?.sentTo).toEqual({ maskedEmail: 'a***@b.com' });
    expect(res.data?.sso).toEqual({ acsUrl: 'https://acs' });
    expect(res.data?.selfProvisionDomains).toBe('b.com');

    // these are gone from the top level
    expect((res as any).totp).toBeUndefined();
    expect((res as any).notp).toBeUndefined();
    expect((res as any).sentTo).toBeUndefined();

    // keysInUse, genericForm & linkId are NOT screen content — they stay top-level
    expect((res as any).keysInUse).toEqual({ email: 'a***@b.com' });
    expect((res as any).genericForm).toEqual({ 'form.foo': 'bar' });
    expect((res as any).linkId).toBe('link-1');
    expect((res.data as any)?.keysInUse).toBeUndefined();
    expect((res.data as any)?.genericForm).toBeUndefined();
    expect((res.data as any)?.linkId).toBeUndefined();
    // identity/context stays at the top level
    expect(res.user).toEqual({ name: 'john' });
  });

  it('ignores a backend-provided `data` key (SDK-owned)', () => {
    const res = build({
      data: { spoofed: true },
      componentsConfig: {
        componentsDynamicAttrs: {
          '[data-name="recoveryCodes"]': {
            attributes: { data: [{ value: 'A' }] },
          },
        },
      },
    });

    expect((res.data as any).spoofed).toBeUndefined();
    expect(res.data?.recoveryCodes).toEqual(['A']);
  });

  it('omits data entirely when there is no componentsConfig', () => {
    const res = build({ user: { name: 'john' }, form: { email: 'a@b.com' } });

    expect(res.data).toBeUndefined();
    // existing top-level fields still pass through unchanged
    expect(res.user).toEqual({ name: 'john' });
    expect(res.form).toEqual({ email: 'a@b.com' });
  });
});
