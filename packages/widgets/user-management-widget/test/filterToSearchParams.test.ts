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
  col('name', { kind: 'text', likeField: 'name' }),
  col('familyName', { kind: 'text', likeField: 'familyName' }),
  // A text column with no exact/like field, to exercise the drop path.
  col('bareText', { kind: 'text' }),
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

  it('name (like field) → searchFields LIKE, never the shared text field', () => {
    const params = run([
      {
        column: 'name',
        operator: 'contains',
        value: 'lena',
        prefix: '%',
        suffix: '%',
      },
    ]);
    expect(params.searchFields).toEqual([{ field: 'name', valStr: '%lena%' }]);
    expect(params.text).toBeUndefined();
  });

  it('drops a text row that maps to no field for its operator', () => {
    // no exact/like field at all, and displayName `equal` has no exact field.
    // Neither writes the shared `text` field (that is the search box's).
    const bare = run([
      { column: 'bareText', operator: 'contains', value: 'x' },
    ]);
    expect(bare.text).toBeUndefined();
    expect(bare.searchFields).toBeUndefined();

    const displayName = run([
      { column: 'displayName', operator: 'equal', value: 'jo' },
    ]);
    expect(displayName.text).toBeUndefined();
    expect(displayName.searchFields).toBeUndefined();
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

    it('drops a negation on a text column with no like field', () => {
      const params = run([
        { column: 'bareText', operator: 'not-contains', value: 'john' },
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

describe('edge cases', () => {
  it('unions two rows on the same array column (both apply, not last-wins)', () => {
    const params = run([
      { column: 'status', operator: 'is-any-of', value: ['active'] },
      { column: 'status', operator: 'is-any-of', value: ['invited'] },
    ]);
    expect(params.statuses).toEqual(['enabled', 'invited']);
  });

  it('does not throw on a nullish column entry in the catalog', () => {
    const cols = [...CATALOG, null as unknown as FilterableColumn];
    expect(() =>
      filterToSearchParams(
        [{ column: 'status', operator: 'is-any-of', value: ['active'] }],
        cols,
      ),
    ).not.toThrow();
  });
});

// Routing matrix: one row per column-mapping x operator the console can offer,
// asserting which request channel it lands in. Mirrors the console
// filterableColumnsMetadata specs so a routing regression (or a console op that
// the widget silently drops) shows up here.
describe('routing matrix (mapping x operator)', () => {
  const CONTAINS = { prefix: '%', suffix: '%' };

  type Channel = 'direct' | 'searchFields' | 'customAttributes' | 'DROP';
  const channelOf = (out: Record<string, any>): Channel => {
    const set = Object.entries(out).filter(
      ([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0),
    );
    if (set.length === 0) return 'DROP';
    if ('searchFields' in Object.fromEntries(set)) return 'searchFields';
    if ('customAttributes' in Object.fromEntries(set))
      return 'customAttributes';
    return 'direct';
  };

  const text = (over: Partial<FieldMapping>): FieldMapping =>
    ({ kind: 'text', ...over }) as FieldMapping;

  type Case = {
    label: string;
    mapping: FieldMapping;
    op: string;
    value: any;
    affix?: { prefix?: string; suffix?: string };
    expected: Channel;
  };

  const LIKE_EXACT = text({ exactField: 'emails', likeField: 'email' });
  const LIKE_ONLY = text({ likeField: 'displayname' });

  const CASES: Case[] = [
    // array
    {
      label: 'array is-any-of',
      mapping: { kind: 'array', field: 'statuses' },
      op: 'is-any-of',
      value: ['active'],
      expected: 'direct',
    },
    // text with exactField + likeField (loginIds/email/phone)
    {
      label: 'text equal (has exactField)',
      mapping: LIKE_EXACT,
      op: 'equal',
      value: 'x',
      expected: 'direct',
    },
    {
      label: 'text not-equal (has likeField)',
      mapping: LIKE_EXACT,
      op: 'not-equal',
      value: 'x',
      expected: 'searchFields',
    },
    {
      label: 'text contains',
      mapping: LIKE_EXACT,
      op: 'contains',
      value: 'x',
      affix: CONTAINS,
      expected: 'searchFields',
    },
    {
      label: 'text not-contains',
      mapping: LIKE_EXACT,
      op: 'not-contains',
      value: 'x',
      affix: CONTAINS,
      expected: 'searchFields',
    },
    {
      label: 'text starts-with',
      mapping: LIKE_EXACT,
      op: 'starts-with',
      value: 'x',
      affix: { suffix: '%' },
      expected: 'searchFields',
    },
    {
      label: 'text ends-with',
      mapping: LIKE_EXACT,
      op: 'ends-with',
      value: 'x',
      affix: { prefix: '%' },
      expected: 'searchFields',
    },
    // text with likeField only (name/givenName/middleName/familyName/displayName)
    {
      label: 'likeField-only contains',
      mapping: LIKE_ONLY,
      op: 'contains',
      value: 'x',
      affix: CONTAINS,
      expected: 'searchFields',
    },
    // KNOWN GAP: console offers `equal` on displayName (LIKE_OPERATORS) but there
    // is no exactField and `equal` is not a LIKE op, so the row is dropped. Flip
    // to 'searchFields'/'direct' when the displayName-equal fix lands.
    {
      label: 'likeField-only equal (KNOWN GAP -> DROP)',
      mapping: LIKE_ONLY,
      op: 'equal',
      value: 'x',
      expected: 'DROP',
    },
    // boolean (needs true/false value)
    {
      label: 'boolean equal true',
      mapping: { kind: 'boolean', field: 'scim' },
      op: 'equal',
      value: 'true',
      expected: 'direct',
    },
    {
      label: 'boolean equal false',
      mapping: { kind: 'boolean', field: 'scim' },
      op: 'equal',
      value: 'false',
      expected: 'direct',
    },
    // custom attribute
    {
      label: 'CA equal',
      mapping: { kind: 'customAttribute', name: 'dept' },
      op: 'equal',
      value: 'x',
      expected: 'customAttributes',
    },
    {
      label: 'CA is-any-of',
      mapping: { kind: 'customAttribute', name: 'tags' },
      op: 'is-any-of',
      value: ['x'],
      expected: 'customAttributes',
    },
    {
      label: 'CA is-empty',
      mapping: { kind: 'customAttribute', name: 'dept' },
      op: 'is-empty',
      value: '',
      expected: 'customAttributes',
    },
  ];

  it.each(CASES)('$label', ({ mapping, op, value, affix, expected }) => {
    const id =
      mapping.kind === 'customAttribute'
        ? `customAttributes.${mapping.name}`
        : 'c';
    const cols = [
      { id, label: id, inputType: 'text', mapping } as FilterableColumn,
    ];
    const out = filterToSearchParams(
      [{ column: id, operator: op, value, ...affix } as any],
      cols,
    );
    expect(channelOf(out)).toBe(expected);
  });
});
