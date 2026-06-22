import '@testing-library/jest-dom';
import { filterToSearchParams } from '../src/lib/widget/state/filterToSearchParams';

describe('filterToSearchParams', () => {
  it('seeds all touched fields with undefined when given no rows', () => {
    const params = filterToSearchParams([]);
    expect(params).toEqual({
      statuses: undefined,
      roleNames: undefined,
      loginIds: undefined,
      emails: undefined,
      phones: undefined,
      text: undefined,
      customAttributes: undefined,
      verifiedEmail: undefined,
      verifiedPhone: undefined,
      password: undefined,
      totp: undefined,
      webauthn: undefined,
      scim: undefined,
    });
  });

  it('maps status is-any-of to statuses, translating active → enabled', () => {
    const params = filterToSearchParams([
      { column: 'status', operator: 'is-any-of', value: ['active', 'invited'] },
    ]);
    expect(params.statuses).toEqual(['enabled', 'invited']);
  });

  it('maps roles is-any-of to roleNames', () => {
    const params = filterToSearchParams([
      {
        column: 'roles',
        operator: 'is-any-of',
        value: ['Tenant Admin', 'Reader'],
      },
    ]);
    expect(params.roleNames).toEqual(['Tenant Admin', 'Reader']);
  });

  it('maps loginIds equal to loginIds exact-match array', () => {
    const params = filterToSearchParams([
      { column: 'loginIds', operator: 'equal', value: 'alice@example.com' },
    ]);
    expect(params.loginIds).toEqual(['alice@example.com']);
  });

  it('maps email equal to emails exact-match array', () => {
    const params = filterToSearchParams([
      { column: 'email', operator: 'equal', value: 'bob@example.com' },
    ]);
    expect(params.emails).toEqual(['bob@example.com']);
  });

  it('maps phone equal to phones exact-match array', () => {
    const params = filterToSearchParams([
      { column: 'phone', operator: 'equal', value: '+15555555555' },
    ]);
    expect(params.phones).toEqual(['+15555555555']);
  });

  it('routes text-column contains operator to the text full-text field', () => {
    const params = filterToSearchParams([
      { column: 'name', operator: 'contains', value: 'moshe' },
    ]);
    expect(params.text).toBe('moshe');
  });

  it('routes any fuzzy text column (familyName/displayName/etc) to text', () => {
    const params = filterToSearchParams([
      { column: 'familyName', operator: 'contains', value: 'cohen' },
    ]);
    expect(params.text).toBe('cohen');
  });

  it('drops not-any-of operator since the endpoint does not support negation', () => {
    const params = filterToSearchParams([
      {
        column: 'status',
        operator: 'not-any-of',
        value: ['enabled'],
      },
    ]);
    expect(params.statuses).toBeUndefined();
  });

  it('drops rows missing column or operator', () => {
    const params = filterToSearchParams([
      { column: '', operator: 'is-any-of', value: ['x'] },
      { column: 'status', operator: '', value: ['x'] },
    ]);
    expect(params.statuses).toBeUndefined();
  });

  it('drops rows whose value is empty', () => {
    const params = filterToSearchParams([
      { column: 'name', operator: 'contains', value: '' },
      { column: 'roles', operator: 'is-any-of', value: [] },
    ]);
    expect(params.text).toBeUndefined();
    expect(params.roleNames).toBeUndefined();
  });

  it('combines status and roles into a single params object', () => {
    const params = filterToSearchParams([
      { column: 'status', operator: 'is-any-of', value: ['active'] },
      { column: 'roles', operator: 'is-any-of', value: ['Reader'] },
    ]);
    expect(params).toEqual(
      expect.objectContaining({
        statuses: ['enabled'],
        roleNames: ['Reader'],
      }),
    );
  });

  it('last text-column row wins when multiple text rows are present', () => {
    const params = filterToSearchParams([
      { column: 'name', operator: 'contains', value: 'first' },
      { column: 'familyName', operator: 'contains', value: 'second' },
    ]);
    expect(params.text).toBe('second');
  });

  describe('custom attributes', () => {
    it('routes customAttributes.<name> rows into the customAttributes map', () => {
      const params = filterToSearchParams([
        {
          column: 'customAttributes.department',
          operator: 'equal',
          value: 'engineering',
        },
      ]);
      expect(params.customAttributes).toEqual({ department: 'engineering' });
    });

    it('preserves array values for multiselect CA rows', () => {
      const params = filterToSearchParams([
        {
          column: 'customAttributes.skills',
          operator: 'is-any-of',
          value: ['ts', 'go'],
        },
      ]);
      expect(params.customAttributes).toEqual({ skills: ['ts', 'go'] });
    });

    it('combines multiple CA rows into one customAttributes map', () => {
      const params = filterToSearchParams([
        {
          column: 'customAttributes.department',
          operator: 'equal',
          value: 'eng',
        },
        {
          column: 'customAttributes.level',
          operator: 'equal',
          value: '5',
        },
      ]);
      expect(params.customAttributes).toEqual({
        department: 'eng',
        level: '5',
      });
    });

    it('drops CA rows with empty values', () => {
      const params = filterToSearchParams([
        { column: 'customAttributes.department', operator: 'equal', value: '' },
        {
          column: 'customAttributes.skills',
          operator: 'is-any-of',
          value: [],
        },
      ]);
      expect(params.customAttributes).toBeUndefined();
    });

    it('drops negated CA operators', () => {
      const params = filterToSearchParams([
        {
          column: 'customAttributes.department',
          operator: 'not-equal',
          value: 'eng',
        },
      ]);
      expect(params.customAttributes).toBeUndefined();
    });

    it('drops a CA row with empty attribute name', () => {
      const params = filterToSearchParams([
        { column: 'customAttributes.', operator: 'equal', value: 'x' },
      ]);
      expect(params.customAttributes).toBeUndefined();
    });

    it('combines CA rows with base columns', () => {
      const params = filterToSearchParams([
        { column: 'status', operator: 'is-any-of', value: ['active'] },
        {
          column: 'customAttributes.department',
          operator: 'equal',
          value: 'eng',
        },
      ]);
      expect(params).toEqual(
        expect.objectContaining({
          statuses: ['enabled'],
          customAttributes: { department: 'eng' },
        }),
      );
    });

    it('emits null for is-empty CA operator', () => {
      const params = filterToSearchParams([
        {
          column: 'customAttributes.department',
          operator: 'is-empty',
          value: null,
        },
      ]);
      expect(params.customAttributes).toEqual({ department: null });
    });

    it('combines is-empty with another CA equal row', () => {
      const params = filterToSearchParams([
        {
          column: 'customAttributes.department',
          operator: 'is-empty',
          value: null,
        },
        {
          column: 'customAttributes.level',
          operator: 'equal',
          value: '5',
        },
      ]);
      expect(params.customAttributes).toEqual({
        department: null,
        level: '5',
      });
    });

    describe('type parsing via cols', () => {
      it('parses boolean CA "true" to JS true', () => {
        const params = filterToSearchParams(
          [
            {
              column: 'customAttributes.is_premium',
              operator: 'equal',
              value: 'true',
            },
          ],
          [
            {
              id: 'customAttributes.is_premium',
              label: 'Premium',
              inputType: 'boolean',
            },
          ],
        );
        expect(params.customAttributes).toEqual({ is_premium: true });
      });

      it('parses boolean CA "false" to JS false', () => {
        const params = filterToSearchParams(
          [
            {
              column: 'customAttributes.is_premium',
              operator: 'equal',
              value: 'false',
            },
          ],
          [
            {
              id: 'customAttributes.is_premium',
              label: 'Premium',
              inputType: 'boolean',
            },
          ],
        );
        expect(params.customAttributes).toEqual({ is_premium: false });
      });

      it('parses numeric CA "5" to JS number 5', () => {
        const params = filterToSearchParams(
          [
            {
              column: 'customAttributes.level',
              operator: 'equal',
              value: '5',
            },
          ],
          [
            {
              id: 'customAttributes.level',
              label: 'Level',
              inputType: 'number',
            },
          ],
        );
        expect(params.customAttributes).toEqual({ level: 5 });
      });

      it('drops numeric CA row with non-numeric value', () => {
        const params = filterToSearchParams(
          [
            {
              column: 'customAttributes.level',
              operator: 'equal',
              value: 'abc',
            },
          ],
          [
            {
              id: 'customAttributes.level',
              label: 'Level',
              inputType: 'number',
            },
          ],
        );
        expect(params.customAttributes).toBeUndefined();
      });

      it('keeps text CA values as strings', () => {
        const params = filterToSearchParams(
          [
            {
              column: 'customAttributes.department',
              operator: 'equal',
              value: 'eng',
            },
          ],
          [
            {
              id: 'customAttributes.department',
              label: 'Department',
              inputType: 'text',
            },
          ],
        );
        expect(params.customAttributes).toEqual({ department: 'eng' });
      });

      it('preserves array values for multiselect CA cols', () => {
        const params = filterToSearchParams(
          [
            {
              column: 'customAttributes.skills',
              operator: 'is-any-of',
              value: ['ts', 'go'],
            },
          ],
          [
            {
              id: 'customAttributes.skills',
              label: 'Skills',
              inputType: 'multiselect',
            },
          ],
        );
        expect(params.customAttributes).toEqual({ skills: ['ts', 'go'] });
      });

      it('combines bool CA with base status row', () => {
        const params = filterToSearchParams(
          [
            { column: 'status', operator: 'is-any-of', value: ['active'] },
            {
              column: 'customAttributes.is_premium',
              operator: 'equal',
              value: 'true',
            },
          ],
          [
            {
              id: 'customAttributes.is_premium',
              label: 'Premium',
              inputType: 'boolean',
            },
          ],
        );
        expect(params).toEqual(
          expect.objectContaining({
            statuses: ['enabled'],
            customAttributes: { is_premium: true },
          }),
        );
      });
    });
  });

  describe('boolean columns', () => {
    it('routes verifiedEmail equal "true" to boolean true', () => {
      const params = filterToSearchParams([
        { column: 'verifiedEmail', operator: 'equal', value: 'true' },
      ]);
      expect(params.verifiedEmail).toBe(true);
    });

    it('routes password equal "false" to boolean false', () => {
      const params = filterToSearchParams([
        { column: 'password', operator: 'equal', value: 'false' },
      ]);
      expect(params.password).toBe(false);
    });

    it('drops boolean row with non-boolean string value', () => {
      const params = filterToSearchParams([
        { column: 'totp', operator: 'equal', value: 'maybe' },
      ]);
      expect(params.totp).toBeUndefined();
    });

    it('drops boolean row with non-equal operator', () => {
      const params = filterToSearchParams([
        { column: 'webauthn', operator: 'not-equal', value: 'true' },
      ]);
      expect(params.webauthn).toBeUndefined();
    });

    it('combines boolean rows with base columns', () => {
      const params = filterToSearchParams([
        { column: 'status', operator: 'is-any-of', value: ['active'] },
        { column: 'verifiedEmail', operator: 'equal', value: 'true' },
        { column: 'SCIM', operator: 'equal', value: 'false' },
      ]);
      expect(params).toEqual(
        expect.objectContaining({
          statuses: ['enabled'],
          verifiedEmail: true,
          scim: false,
        }),
      );
    });

    it('routes uppercase SCIM column id to lowercase proto field', () => {
      const params = filterToSearchParams([
        { column: 'SCIM', operator: 'equal', value: 'true' },
      ]);
      expect(params.scim).toBe(true);
    });
  });
});
