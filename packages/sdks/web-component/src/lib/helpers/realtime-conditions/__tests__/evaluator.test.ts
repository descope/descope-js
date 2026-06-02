import {
  collectTouchedComponentIds,
  evaluateAll,
  evaluateResidual,
  isEmpty,
  toBoolean,
  toFloat,
  toSlice,
  toString,
} from '../evaluator';
import type { RealtimeComponentsCondition } from '../../../types';

const noValidity = () => undefined;

describe('coercion helpers', () => {
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

  it('toBoolean coerces string/boolean/number inputs', () => {
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

describe('evaluateAtomic via evaluateResidual — operators', () => {
  function residualWithSingleAtom(
    operator: string,
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
    const r = residualWithSingleAtom('empty', {
      kind: 'form',
      form: 'form.phone',
    });
    expect(evaluateResidual(r, {}, noValidity)).toBe(true);
    expect(evaluateResidual(r, { 'form.phone': '+1' }, noValidity)).toBe(false);

    const rNotEmpty = residualWithSingleAtom('not-empty', {
      kind: 'form',
      form: 'form.phone',
    });
    expect(evaluateResidual(rNotEmpty, { 'form.phone': '' }, noValidity)).toBe(
      false,
    );
    expect(
      evaluateResidual(rNotEmpty, { 'form.phone': '+1' }, noValidity),
    ).toBe(true);
  });

  it('equal compares string and literal value', () => {
    const r = residualWithSingleAtom(
      'equal',
      { kind: 'form', form: 'form.country' },
      { kind: 'value', value: 'US' },
    );
    expect(evaluateResidual(r, { 'form.country': 'US' }, noValidity)).toBe(
      true,
    );
    expect(evaluateResidual(r, { 'form.country': 'FR' }, noValidity)).toBe(
      false,
    );
  });

  it('greater-than coerces string numerics', () => {
    const r = residualWithSingleAtom(
      'greater-than',
      { kind: 'form', form: 'form.age' },
      { kind: 'value', value: 18 },
    );
    expect(evaluateResidual(r, { 'form.age': '25' }, noValidity)).toBe(true);
    expect(evaluateResidual(r, { 'form.age': '17' }, noValidity)).toBe(false);
    expect(evaluateResidual(r, { 'form.age': 'abc' }, noValidity)).toBe(false);
  });

  it('is-true / is-false on form-typed values', () => {
    const rTrue = residualWithSingleAtom('is-true', {
      kind: 'form',
      form: 'form.agree',
    });
    expect(evaluateResidual(rTrue, { 'form.agree': 'true' }, noValidity)).toBe(
      true,
    );
    expect(evaluateResidual(rTrue, { 'form.agree': true }, noValidity)).toBe(
      true,
    );
    expect(evaluateResidual(rTrue, { 'form.agree': 'false' }, noValidity)).toBe(
      false,
    );

    const rFalse = residualWithSingleAtom('is-false', {
      kind: 'form',
      form: 'form.agree',
    });
    expect(
      evaluateResidual(rFalse, { 'form.agree': 'false' }, noValidity),
    ).toBe(true);
  });

  it('contains works for string and array targets', () => {
    const rStr = residualWithSingleAtom(
      'contains',
      { kind: 'form', form: 'form.greeting' },
      { kind: 'value', value: 'world' },
    );
    expect(
      evaluateResidual(rStr, { 'form.greeting': 'hello world' }, noValidity),
    ).toBe(true);
    expect(
      evaluateResidual(rStr, { 'form.greeting': 'hello there' }, noValidity),
    ).toBe(false);
  });

  it('in / not-in', () => {
    const rIn = residualWithSingleAtom(
      'in',
      { kind: 'form', form: 'form.country' },
      { kind: 'value', value: ['US', 'CA'] },
    );
    expect(evaluateResidual(rIn, { 'form.country': 'US' }, noValidity)).toBe(
      true,
    );
    expect(evaluateResidual(rIn, { 'form.country': 'FR' }, noValidity)).toBe(
      false,
    );
  });

  it('matches uses regex', () => {
    const r = residualWithSingleAtom(
      'matches',
      { kind: 'form', form: 'form.zip' },
      { kind: 'value', value: '^\\d{5}$' },
    );
    expect(evaluateResidual(r, { 'form.zip': '12345' }, noValidity)).toBe(true);
    expect(evaluateResidual(r, { 'form.zip': '1234' }, noValidity)).toBe(false);
    expect(evaluateResidual(r, { 'form.zip': 'abcde' }, noValidity)).toBe(
      false,
    );
  });

  it('matches returns false on invalid regex without throwing', () => {
    const r = residualWithSingleAtom(
      'matches',
      { kind: 'form', form: 'form.zip' },
      { kind: 'value', value: '(bad' },
    );
    expect(evaluateResidual(r, { 'form.zip': '12345' }, noValidity)).toBe(
      false,
    );
  });

  it('is-email / is-phone delegate to validity checker', () => {
    const r = residualWithSingleAtom('is-email', {
      kind: 'form',
      form: 'form.email',
    });
    expect(evaluateResidual(r, { 'form.email': 'x' }, () => true)).toBe(true);
    expect(evaluateResidual(r, { 'form.email': 'x' }, () => false)).toBe(false);
    expect(evaluateResidual(r, { 'form.email': 'x' }, () => undefined)).toBe(
      false,
    );
  });

  it('pre-evaluated atomic via is-true on literal boolean', () => {
    const rTrue = residualWithSingleAtom('is-true', {
      kind: 'value',
      value: true,
    });
    expect(evaluateResidual(rTrue, {}, noValidity)).toBe(true);

    const rFalse = residualWithSingleAtom('is-true', {
      kind: 'value',
      value: false,
    });
    expect(evaluateResidual(rFalse, {}, noValidity)).toBe(false);
  });

  it('unknown operator returns false', () => {
    const r = residualWithSingleAtom('unknown-op', {
      kind: 'form',
      form: 'form.x',
    });
    expect(evaluateResidual(r, { 'form.x': 'whatever' }, noValidity)).toBe(
      false,
    );
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
    expect(
      evaluateResidual(r, { 'form.a': '', 'form.b': '' }, noValidity),
    ).toBe(true);
    expect(
      evaluateResidual(r, { 'form.a': '', 'form.b': 'x' }, noValidity),
    ).toBe(false);
    expect(
      evaluateResidual(r, { 'form.a': 'x', 'form.b': '' }, noValidity),
    ).toBe(false);
  });

  it('OR fires if any atomic fires', () => {
    const rOr: RealtimeComponentsCondition = {
      ...r,
      rules: [{ ...r.rules[0], logicalOr: true }],
    };
    expect(
      evaluateResidual(rOr, { 'form.a': 'x', 'form.b': 'x' }, noValidity),
    ).toBe(false);
    expect(
      evaluateResidual(rOr, { 'form.a': '', 'form.b': 'x' }, noValidity),
    ).toBe(true);
    expect(
      evaluateResidual(rOr, { 'form.a': 'x', 'form.b': '' }, noValidity),
    ).toBe(true);
  });

  it('multiple rules are OR-combined at the residual level', () => {
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
    expect(
      evaluateResidual(multi, { 'form.a': '', 'form.b': 'x' }, noValidity),
    ).toBe(true);
    expect(
      evaluateResidual(multi, { 'form.a': 'x', 'form.b': '' }, noValidity),
    ).toBe(true);
    expect(
      evaluateResidual(multi, { 'form.a': 'x', 'form.b': 'x' }, noValidity),
    ).toBe(false);
  });
});

describe('evaluateAll across residuals', () => {
  it('returns first-wins action map per component', () => {
    const residuals: RealtimeComponentsCondition[] = [
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
    const out = evaluateAll(
      residuals,
      { 'form.x': '', 'form.y': 'val' },
      noValidity,
    );
    expect(out).toEqual({ _a: 'hide', _b: 'disable' });
  });

  it('omits components whose residuals do not fire', () => {
    const residuals: RealtimeComponentsCondition[] = [
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
    const out = evaluateAll(residuals, { 'form.x': 'x' }, noValidity);
    expect(out).toEqual({});
  });
});

describe('collectTouchedComponentIds', () => {
  const residuals: RealtimeComponentsCondition[] = [
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
    expect(Array.from(collectTouchedComponentIds(residuals))).toEqual([
      '_a',
      '_b',
      '_c',
    ]);
  });

  it('returns empty results on undefined input', () => {
    expect(collectTouchedComponentIds(undefined).size).toBe(0);
  });
});
