import '@testing-library/jest-dom';
import { filterToSearchParams } from '../src/lib/widget/helpers/filterToSearchParams';
import { FilterableColumn, FieldMapping } from '../src/lib/widget/api/types';

const col = (
  id: string,
  mapping: FieldMapping,
  inputType = 'text',
): FilterableColumn =>
  ({ id, label: id, inputType, mapping }) as FilterableColumn;

// Column catalog with the field mappings baked into the published data.
const CATALOG: FilterableColumn[] = [
  col(
    'status',
    { kind: 'array', field: 'statuses', valueMap: { active: 'enabled' } },
    'multiselect',
  ),
  col('roles', { kind: 'array', field: 'roleNames' }, 'multiselect'),
  col('loginIds', {
    kind: 'text',
    exactField: 'loginIds',
    likeField: 'externalid',
  }),
  col('displayName', { kind: 'text', likeField: 'displayname' }),
  col(
    'email',
    { kind: 'text', exactField: 'emails', likeField: 'email' },
    'email',
  ),
  col('phone', {
    kind: 'text',
    exactField: 'phones',
    likeField: 'phonenumber',
  }),
  col('name', { kind: 'text' }),
  col('familyName', { kind: 'text' }),
  col('verifiedEmail', { kind: 'boolean', field: 'verifiedEmail' }, 'boolean'),
  col('SCIM', { kind: 'boolean', field: 'scim' }, 'boolean'),
  col(
    'customAttributes.department',
    { kind: 'customAttribute', name: 'department' },
    'text',
  ),
  col(
    'customAttributes.is_premium',
    { kind: 'customAttribute', name: 'is_premium' },
    'boolean',
  ),
  col(
    'customAttributes.level',
    { kind: 'customAttribute', name: 'level' },
    'number',
  ),
  col(
    'customAttributes.skills',
    { kind: 'customAttribute', name: 'skills' },
    'multiselect',
  ),
];

const run = (rows: any[]) => filterToSearchParams(rows, CATALOG);

describe('filterToSearchParams', () => {
  it('clears only the fields the configured columns can write (never text)', () => {
    expect(run([])).toEqual({
      statuses: undefined,
      roleNames: undefined,
      loginIds: undefined,
      emails: undefined,
      phones: undefined,
      verifiedEmail: undefined,
      scim: undefined,
      searchFields: undefined,
      customAttributes: undefined,
    });
  });

  it('never clears text — it is co-owned by the standalone search input', () => {
    const params = run([
      { column: 'status', operator: 'is-any-of', value: ['active'] },
    ]);
    expect('text' in params).toBe(false);
    expect(params.statuses).toEqual(['enabled']);
  });

  it('array: is-any-of → field, applying valueMap', () => {
    expect(
      run([
        {
          column: 'status',
          operator: 'is-any-of',
          value: ['active', 'invited'],
        },
      ]).statuses,
    ).toEqual(['enabled', 'invited']);
    expect(
      run([{ column: 'roles', operator: 'is-any-of', value: ['Admin'] }])
        .roleNames,
    ).toEqual(['Admin']);
  });

  it('text equal → exact array field when configured', () => {
    expect(
      run([{ column: 'loginIds', operator: 'equal', value: 'a@b.com' }])
        .loginIds,
    ).toEqual(['a@b.com']);
    expect(
      run([{ column: 'email', operator: 'equal', value: 'b@c.com' }]).emails,
    ).toEqual(['b@c.com']);
  });

  it('text equal → full-text when no exact field (displayName/name)', () => {
    expect(
      run([{ column: 'name', operator: 'contains', value: 'moshe' }]).text,
    ).toBe('moshe');
    expect(
      run([{ column: 'displayName', operator: 'equal', value: 'jo' }]).text,
    ).toBe('jo');
    expect(
      run([{ column: 'displayName', operator: 'equal', value: 'jo' }])
        .searchFields,
    ).toBeUndefined();
  });

  it('boolean equal true/false → optional bool field', () => {
    expect(
      run([{ column: 'verifiedEmail', operator: 'equal', value: 'true' }])
        .verifiedEmail,
    ).toBe(true);
    expect(
      run([{ column: 'SCIM', operator: 'equal', value: 'false' }]).scim,
    ).toBe(false);
  });

  it('drops boolean row with a non-boolean value', () => {
    expect(
      run([{ column: 'verifiedEmail', operator: 'equal', value: 'maybe' }])
        .verifiedEmail,
    ).toBeUndefined();
  });

  describe('searchFields (LIKE)', () => {
    it('affixes prefix/suffix into valStr', () => {
      const params = run([
        {
          column: 'displayName',
          operator: 'contains',
          value: 'john',
          prefix: '%',
          suffix: '%',
        },
      ]);
      expect(params.searchFields).toEqual([
        { field: 'displayname', valStr: '%john%' },
      ]);
      expect(params.text).toBeUndefined();
    });

    it('starts-with suffix only, ends-with prefix only', () => {
      const params = run([
        {
          column: 'displayName',
          operator: 'starts-with',
          value: 'jo',
          suffix: '%',
        },
        { column: 'phone', operator: 'ends-with', value: '99', prefix: '%' },
      ]);
      expect(params.searchFields).toEqual([
        { field: 'displayname', valStr: 'jo%' },
        { field: 'phonenumber', valStr: '%99' },
      ]);
    });

    it('not-equal → negative searchField', () => {
      expect(
        run([{ column: 'email', operator: 'not-equal', value: 'a@b.com' }])
          .searchFields,
      ).toEqual([{ field: 'email', valStr: 'a@b.com', negative: true }]);
    });

    it('full-text for text columns with no LIKE field (name)', () => {
      const params = run([
        {
          column: 'name',
          operator: 'contains',
          value: 'john',
          prefix: '%',
          suffix: '%',
        },
      ]);
      expect(params.searchFields).toBeUndefined();
      expect(params.text).toBe('john');
    });

    it('drops a LIKE row with an empty value', () => {
      expect(
        run([
          {
            column: 'email',
            operator: 'contains',
            value: '',
            prefix: '%',
            suffix: '%',
          },
        ]).searchFields,
      ).toBeUndefined();
    });

    it('uses the first element of an array value', () => {
      expect(
        run([
          {
            column: 'email',
            operator: 'contains',
            value: ['john', 'jane'],
            prefix: '%',
            suffix: '%',
          },
        ]).searchFields,
      ).toEqual([{ field: 'email', valStr: '%john%' }]);
    });
  });

  describe('drops / never inverts', () => {
    it('drops not-any-of on a multiselect (never becomes is-any-of)', () => {
      expect(
        run([{ column: 'status', operator: 'not-any-of', value: ['enabled'] }])
          .statuses,
      ).toBeUndefined();
    });

    it('drops a negation on a non-LIKE text column (never full-text)', () => {
      const params = run([
        { column: 'name', operator: 'not-contains', value: 'john' },
      ]);
      expect(params.text).toBeUndefined();
      expect(params.searchFields).toBeUndefined();
    });

    it('drops rows missing column or operator', () => {
      expect(
        run([
          { column: '', operator: 'is-any-of', value: ['x'] },
          { column: 'status', operator: '', value: ['x'] },
        ]).statuses,
      ).toBeUndefined();
    });

    it('drops empty values', () => {
      const params = run([
        { column: 'name', operator: 'contains', value: '' },
        { column: 'roles', operator: 'is-any-of', value: [] },
      ]);
      expect(params.text).toBeUndefined();
      expect(params.roleNames).toBeUndefined();
    });

    it('ignores a row whose column is not in the catalog', () => {
      expect(
        'statuses' in
          run([{ column: 'unknownColumn', operator: 'equal', value: 'x' }]),
      ).toBe(true);
      expect(
        run([{ column: 'unknownColumn', operator: 'equal', value: 'x' }])
          .statuses,
      ).toBeUndefined();
    });

    it('skips a column with an unrecognized mapping kind (forward-compat)', () => {
      const cols = [
        {
          id: 'future',
          label: 'future',
          inputType: 'text',
          mapping: { kind: 'brand-new' },
        } as any,
      ];
      const params = filterToSearchParams(
        [{ column: 'future', operator: 'equal', value: 'x' }],
        cols,
      );
      expect(params).toEqual({
        searchFields: undefined,
        customAttributes: undefined,
      });
    });

    it('skips a column with no mapping', () => {
      const cols = [
        { id: 'plain', label: 'plain', inputType: 'text' } as FilterableColumn,
      ];
      expect(
        filterToSearchParams(
          [{ column: 'plain', operator: 'equal', value: 'x' }],
          cols,
        ),
      ).toEqual({
        searchFields: undefined,
        customAttributes: undefined,
      });
    });
  });

  describe('custom attributes', () => {
    it('maps equal → customAttributes', () => {
      expect(
        run([
          {
            column: 'customAttributes.department',
            operator: 'equal',
            value: 'eng',
          },
        ]).customAttributes,
      ).toEqual({ department: 'eng' });
    });

    it('preserves array values for multiselect CA', () => {
      expect(
        run([
          {
            column: 'customAttributes.skills',
            operator: 'is-any-of',
            value: ['ts', 'go'],
          },
        ]).customAttributes,
      ).toEqual({ skills: ['ts', 'go'] });
    });

    it('parses boolean CA by inputType', () => {
      expect(
        run([
          {
            column: 'customAttributes.is_premium',
            operator: 'equal',
            value: 'true',
          },
        ]).customAttributes,
      ).toEqual({ is_premium: true });
      expect(
        run([
          {
            column: 'customAttributes.is_premium',
            operator: 'equal',
            value: 'maybe',
          },
        ]).customAttributes,
      ).toBeUndefined();
    });

    it('parses numeric CA by inputType', () => {
      expect(
        run([
          { column: 'customAttributes.level', operator: 'equal', value: '5' },
        ]).customAttributes,
      ).toEqual({ level: 5 });
      expect(
        run([
          { column: 'customAttributes.level', operator: 'equal', value: 'abc' },
        ]).customAttributes,
      ).toBeUndefined();
    });

    it('is-empty → null', () => {
      expect(
        run([
          {
            column: 'customAttributes.department',
            operator: 'is-empty',
            value: null,
          },
        ]).customAttributes,
      ).toEqual({ department: null });
    });

    it('drops negated CA operators', () => {
      expect(
        run([
          {
            column: 'customAttributes.department',
            operator: 'not-equal',
            value: 'eng',
          },
        ]).customAttributes,
      ).toBeUndefined();
    });

    it('combines CA rows with base columns', () => {
      const params = run([
        { column: 'status', operator: 'is-any-of', value: ['active'] },
        {
          column: 'customAttributes.is_premium',
          operator: 'equal',
          value: 'true',
        },
      ]);
      expect(params).toEqual(
        expect.objectContaining({
          statuses: ['enabled'],
          customAttributes: { is_premium: true },
        }),
      );
    });
  });

  it('defaults to an empty catalog when cols are omitted', () => {
    expect(
      filterToSearchParams([
        { column: 'status', operator: 'is-any-of', value: ['x'] },
      ]),
    ).toEqual({ searchFields: undefined, customAttributes: undefined });
  });

  it('drops a boolean row with a non-equal operator', () => {
    expect(
      run([{ column: 'verifiedEmail', operator: 'not-equal', value: 'true' }])
        .verifiedEmail,
    ).toBeUndefined();
  });

  it('drops a text exact row with an empty value', () => {
    expect(
      run([{ column: 'loginIds', operator: 'equal', value: '' }]).loginIds,
    ).toBeUndefined();
  });

  it('parses boolean CA "false" and drops empty/empty-array CA values', () => {
    expect(
      run([
        {
          column: 'customAttributes.is_premium',
          operator: 'equal',
          value: 'false',
        },
      ]).customAttributes,
    ).toEqual({ is_premium: false });
    expect(
      run([
        { column: 'customAttributes.department', operator: 'equal', value: '' },
      ]).customAttributes,
    ).toBeUndefined();
    expect(
      run([
        { column: 'customAttributes.skills', operator: 'is-any-of', value: [] },
      ]).customAttributes,
    ).toBeUndefined();
  });

  it('accumulates multiple CA rows into one map', () => {
    expect(
      run([
        {
          column: 'customAttributes.department',
          operator: 'equal',
          value: 'eng',
        },
        { column: 'customAttributes.level', operator: 'equal', value: '5' },
      ]).customAttributes,
    ).toEqual({ department: 'eng', level: 5 });
  });

  it('last text row wins (single text field)', () => {
    expect(
      run([
        { column: 'name', operator: 'contains', value: 'first' },
        { column: 'familyName', operator: 'contains', value: 'second' },
      ]).text,
    ).toBe('second');
  });

  it('combines multiple categories in one call', () => {
    const params = run([
      { column: 'status', operator: 'is-any-of', value: ['active'] },
      { column: 'roles', operator: 'is-any-of', value: ['Admin'] },
      { column: 'verifiedEmail', operator: 'equal', value: 'true' },
      {
        column: 'email',
        operator: 'contains',
        value: 'x',
        prefix: '%',
        suffix: '%',
      },
      {
        column: 'customAttributes.department',
        operator: 'equal',
        value: 'eng',
      },
    ]);
    expect(params).toEqual(
      expect.objectContaining({
        statuses: ['enabled'],
        roleNames: ['Admin'],
        verifiedEmail: true,
        searchFields: [{ field: 'email', valStr: '%x%' }],
        customAttributes: { department: 'eng' },
      }),
    );
  });
});
