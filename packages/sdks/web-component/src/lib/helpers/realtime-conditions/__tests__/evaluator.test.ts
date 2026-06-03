import {
  collectTouchedComponentIds,
  evaluateAll,
  evaluateCondition,
  isEmpty,
  toBoolean,
  toFloat,
  toSlice,
  toString,
} from '../evaluator';
import type {
  RealtimeComponentsCondition,
  RealtimeOperator,
} from '../../../types';

describe('type-conversion helpers', () => {
  it('toFloat handles numbers, numeric strings, booleans', () => {
    expect(toFloat(42)).toEqual({ value: 42, ok: true });
    expect(toFloat('25.5')).toEqual({ value: 25.5, ok: true });
    expect(toFloat(true)).toEqual({ value: 1, ok: true });
    expect(toFloat(false)).toEqual({ value: 0, ok: true });
    expect(toFloat('abc').ok).toBe(false);
    expect(toFloat('').ok).toBe(false);
    expect(toFloat('   ').ok).toBe(false);
    expect(toFloat(null).ok).toBe(false);
    expect(toFloat(undefined).ok).toBe(false);
  });

  it('toString matches Go AnyToString semantics for common cases', () => {
    expect(toString(42)).toBe('42');
    expect(toString(3.14)).toBe('3.14');
    expect(toString(true)).toBe('true');
    expect(toString(false)).toBe('false');
    expect(toString('hello')).toBe('hello');
    expect(toString(null)).toBe('');
    expect(toString(undefined)).toBe('');
  });

  it('toBoolean converts string/boolean/number inputs', () => {
    expect(toBoolean(true)).toEqual({ value: true, ok: true });
    expect(toBoolean('true')).toEqual({ value: true, ok: true });
    expect(toBoolean('false')).toEqual({ value: false, ok: true });
    expect(toBoolean(0)).toEqual({ value: false, ok: true });
    expect(toBoolean(1)).toEqual({ value: true, ok: true });
    expect(toBoolean('hello').ok).toBe(false);
  });

  it('toSlice handles arrays and CSV strings', () => {
    expect(toSlice(['a', 'b'])).toEqual(['a', 'b']);
    expect(toSlice('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(toSlice(42)).toBeNull();
  });

  it('isEmpty handles strings, arrays, objects', () => {
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('x')).toBe(false);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty([1])).toBe(false);
    expect(isEmpty({})).toBe(true);
    expect(isEmpty({ a: 1 })).toBe(false);
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });
});

describe('evaluateAtomic via evaluateCondition — operators', () => {
  function conditionWithSingleAtom(
    operator: RealtimeOperator,
    target: any,
    predicate?: any,
  ): RealtimeComponentsCondition {
    return {
      componentIds: ['_x'],
      action: 'hide',
      rules: [
        {
          atomicConditions: [
            {
              operator,
              target,
              ...(predicate !== undefined ? { predicate } : {}),
            },
          ],
        },
      ],
    };
  }

  it('empty / not-empty fire correctly on form keys', () => {
    const r = conditionWithSingleAtom('empty', {
      kind: 'form',
      form: 'form.phone',
    });
    expect(evaluateCondition(r, {})).toBe(true);
    expect(evaluateCondition(r, { 'form.phone': '+1' })).toBe(false);

    const rNotEmpty = conditionWithSingleAtom('not-empty', {
      kind: 'form',
      form: 'form.phone',
    });
    expect(evaluateCondition(rNotEmpty, { 'form.phone': '' })).toBe(false);
    expect(evaluateCondition(rNotEmpty, { 'form.phone': '+1' })).toBe(true);
  });

  it('equal compares string and literal value', () => {
    const r = conditionWithSingleAtom(
      'equal',
      { kind: 'form', form: 'form.country' },
      { kind: 'value', value: 'US' },
    );
    expect(evaluateCondition(r, { 'form.country': 'US' })).toBe(true);
    expect(evaluateCondition(r, { 'form.country': 'FR' })).toBe(false);
  });

  it('greater-than converts string numerics', () => {
    const r = conditionWithSingleAtom(
      'greater-than',
      { kind: 'form', form: 'form.age' },
      { kind: 'value', value: 18 },
    );
    expect(evaluateCondition(r, { 'form.age': '25' })).toBe(true);
    expect(evaluateCondition(r, { 'form.age': '17' })).toBe(false);
    expect(evaluateCondition(r, { 'form.age': 'abc' })).toBe(false);
  });

  it('is-true / is-false on form-typed values', () => {
    const rTrue = conditionWithSingleAtom('is-true', {
      kind: 'form',
      form: 'form.agree',
    });
    expect(evaluateCondition(rTrue, { 'form.agree': 'true' })).toBe(true);
    expect(evaluateCondition(rTrue, { 'form.agree': true })).toBe(true);
    expect(evaluateCondition(rTrue, { 'form.agree': 'false' })).toBe(false);

    const rFalse = conditionWithSingleAtom('is-false', {
      kind: 'form',
      form: 'form.agree',
    });
    expect(evaluateCondition(rFalse, { 'form.agree': 'false' })).toBe(true);
  });

  it('contains works for string and array targets', () => {
    const rStr = conditionWithSingleAtom(
      'contains',
      { kind: 'form', form: 'form.greeting' },
      { kind: 'value', value: 'world' },
    );
    expect(evaluateCondition(rStr, { 'form.greeting': 'hello world' })).toBe(
      true,
    );
    expect(evaluateCondition(rStr, { 'form.greeting': 'hello there' })).toBe(
      false,
    );
  });

  it('in / not-in', () => {
    const rIn = conditionWithSingleAtom(
      'in',
      { kind: 'form', form: 'form.country' },
      { kind: 'value', value: ['US', 'CA'] },
    );
    expect(evaluateCondition(rIn, { 'form.country': 'US' })).toBe(true);
    expect(evaluateCondition(rIn, { 'form.country': 'FR' })).toBe(false);

    const rNotIn = conditionWithSingleAtom(
      'not-in',
      { kind: 'form', form: 'form.country' },
      { kind: 'value', value: ['US', 'CA'] },
    );
    expect(evaluateCondition(rNotIn, { 'form.country': 'FR' })).toBe(true);
    expect(evaluateCondition(rNotIn, { 'form.country': 'US' })).toBe(false);
  });

  it('not-in returns false when the predicate is not sliceable', () => {
    // Matches `in`'s "false on bad input" policy — the previous behavior
    // (true on non-sliceable) was inconsistent.
    const r = conditionWithSingleAtom(
      'not-in',
      { kind: 'form', form: 'form.country' },
      { kind: 'value', value: 42 },
    );
    expect(evaluateCondition(r, { 'form.country': 'US' })).toBe(false);
  });

  it('in resolves a list-kind predicate with form-placeholder items', () => {
    // The server emits a list operand when an `in` predicate is an array that
    // contains `{{form.X}}` references to on-screen keys; each item is
    // resolved against the live snapshot at eval time.
    const r = conditionWithSingleAtom(
      'in',
      { kind: 'form', form: 'form.role' },
      {
        kind: 'list',
        items: [
          { kind: 'form', form: 'form.allowedRole' },
          { kind: 'value', value: 'admin' },
        ],
      },
    );
    expect(
      evaluateCondition(r, {
        'form.role': 'editor',
        'form.allowedRole': 'editor',
      }),
    ).toBe(true);
    expect(
      evaluateCondition(r, {
        'form.role': 'admin',
        'form.allowedRole': 'editor',
      }),
    ).toBe(true);
    expect(
      evaluateCondition(r, {
        'form.role': 'viewer',
        'form.allowedRole': 'editor',
      }),
    ).toBe(false);
  });

  it('not-in with a list-kind predicate resolves placeholders', () => {
    const r = conditionWithSingleAtom(
      'not-in',
      { kind: 'form', form: 'form.role' },
      {
        kind: 'list',
        items: [
          { kind: 'form', form: 'form.bannedRole' },
          { kind: 'value', value: 'guest' },
        ],
      },
    );
    expect(
      evaluateCondition(r, {
        'form.role': 'editor',
        'form.bannedRole': 'admin',
      }),
    ).toBe(true);
    expect(
      evaluateCondition(r, {
        'form.role': 'admin',
        'form.bannedRole': 'admin',
      }),
    ).toBe(false);
  });

  it('contains with a list-kind target resolves placeholders', () => {
    // Reverse direction: the server may emit a list-kind target if the form
    // ref is on the LHS of `contains`. The list materializes as an array;
    // `contains` checks membership against the predicate.
    const r = conditionWithSingleAtom(
      'contains',
      {
        kind: 'list',
        items: [
          { kind: 'form', form: 'form.tag' },
          { kind: 'value', value: 'baseline' },
        ],
      },
      { kind: 'value', value: 'urgent' },
    );
    expect(evaluateCondition(r, { 'form.tag': 'urgent' })).toBe(true);
    expect(evaluateCondition(r, { 'form.tag': 'normal' })).toBe(false);
  });

  it('matches uses regex', () => {
    const r = conditionWithSingleAtom(
      'matches',
      { kind: 'form', form: 'form.zip' },
      { kind: 'value', value: '^\\d{5}$' },
    );
    expect(evaluateCondition(r, { 'form.zip': '12345' })).toBe(true);
    expect(evaluateCondition(r, { 'form.zip': '1234' })).toBe(false);
    expect(evaluateCondition(r, { 'form.zip': 'abcde' })).toBe(false);
  });

  it('matches returns false on invalid regex without throwing', () => {
    const r = conditionWithSingleAtom(
      'matches',
      { kind: 'form', form: 'form.zip' },
      { kind: 'value', value: '(bad' },
    );
    expect(evaluateCondition(r, { 'form.zip': '12345' })).toBe(false);
  });

  it('pre-evaluated atomic via is-true on literal boolean', () => {
    const rTrue = conditionWithSingleAtom('is-true', {
      kind: 'value',
      value: true,
    });
    expect(evaluateCondition(rTrue, {})).toBe(true);

    const rFalse = conditionWithSingleAtom('is-true', {
      kind: 'value',
      value: false,
    });
    expect(evaluateCondition(rFalse, {})).toBe(false);
  });

  it('unknown operator returns false', () => {
    const r = conditionWithSingleAtom(
      'unknown-op' as unknown as RealtimeOperator,
      { kind: 'form', form: 'form.x' },
    );
    expect(evaluateCondition(r, { 'form.x': 'whatever' })).toBe(false);
  });
});

describe('rule combination (AND / OR)', () => {
  const r: RealtimeComponentsCondition = {
    componentIds: ['_x'],
    action: 'hide',
    rules: [
      {
        atomicConditions: [
          { operator: 'empty', target: { kind: 'form', form: 'form.a' } },
          { operator: 'empty', target: { kind: 'form', form: 'form.b' } },
        ],
      },
    ],
  };

  it('AND (default) requires all atomics', () => {
    expect(evaluateCondition(r, { 'form.a': '', 'form.b': '' })).toBe(true);
    expect(evaluateCondition(r, { 'form.a': '', 'form.b': 'x' })).toBe(false);
    expect(evaluateCondition(r, { 'form.a': 'x', 'form.b': '' })).toBe(false);
  });

  it('OR fires if any atomic fires', () => {
    const rOr: RealtimeComponentsCondition = {
      ...r,
      rules: [{ ...r.rules[0], logicalOr: true }],
    };
    expect(evaluateCondition(rOr, { 'form.a': 'x', 'form.b': 'x' })).toBe(
      false,
    );
    expect(evaluateCondition(rOr, { 'form.a': '', 'form.b': 'x' })).toBe(true);
    expect(evaluateCondition(rOr, { 'form.a': 'x', 'form.b': '' })).toBe(true);
  });

  it('multiple rules are OR-combined at the condition-group level', () => {
    const multi: RealtimeComponentsCondition = {
      componentIds: ['_x'],
      action: 'hide',
      rules: [
        {
          atomicConditions: [
            { operator: 'empty', target: { kind: 'form', form: 'form.a' } },
          ],
        },
        {
          atomicConditions: [
            { operator: 'empty', target: { kind: 'form', form: 'form.b' } },
          ],
        },
      ],
    };
    expect(evaluateCondition(multi, { 'form.a': '', 'form.b': 'x' })).toBe(
      true,
    );
    expect(evaluateCondition(multi, { 'form.a': 'x', 'form.b': '' })).toBe(
      true,
    );
    expect(evaluateCondition(multi, { 'form.a': 'x', 'form.b': 'x' })).toBe(
      false,
    );
  });
});

describe('evaluateAll across condition groups', () => {
  it('returns first-wins action map per component', () => {
    const conditions: RealtimeComponentsCondition[] = [
      {
        id: 'cc1',
        componentIds: ['_a'],
        action: 'hide',
        rules: [
          {
            atomicConditions: [
              { operator: 'empty', target: { kind: 'form', form: 'form.x' } },
            ],
          },
        ],
      },
      {
        id: 'cc2',
        componentIds: ['_b'],
        action: 'disable',
        rules: [
          {
            atomicConditions: [
              {
                operator: 'not-empty',
                target: { kind: 'form', form: 'form.y' },
              },
            ],
          },
        ],
      },
    ];
    const out = evaluateAll(conditions, { 'form.x': '', 'form.y': 'val' });
    expect(out).toEqual({ _a: 'hide', _b: 'disable' });
  });

  it('omits components whose condition groups do not fire', () => {
    const conditions: RealtimeComponentsCondition[] = [
      {
        componentIds: ['_a'],
        action: 'hide',
        rules: [
          {
            atomicConditions: [
              { operator: 'empty', target: { kind: 'form', form: 'form.x' } },
            ],
          },
        ],
      },
    ];
    const out = evaluateAll(conditions, { 'form.x': 'x' });
    expect(out).toEqual({});
  });
});

describe('collectTouchedComponentIds', () => {
  const conditions: RealtimeComponentsCondition[] = [
    {
      componentIds: ['_a'],
      action: 'hide',
      rules: [
        {
          atomicConditions: [
            { operator: 'empty', target: { kind: 'form', form: 'form.x' } },
          ],
        },
      ],
    },
    {
      componentIds: ['_b', '_c'],
      action: 'disable',
      rules: [
        {
          atomicConditions: [
            {
              operator: 'equal',
              target: { kind: 'form', form: 'form.y' },
              predicate: { kind: 'form', form: 'form.z' },
            },
          ],
        },
      ],
    },
  ];

  it('collects all touched component IDs', () => {
    expect(Array.from(collectTouchedComponentIds(conditions))).toEqual([
      '_a',
      '_b',
      '_c',
    ]);
  });

  it('returns empty results on undefined input', () => {
    expect(collectTouchedComponentIds(undefined).size).toBe(0);
  });
});
