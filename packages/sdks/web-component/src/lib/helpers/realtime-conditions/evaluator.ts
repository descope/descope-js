import type {
  RealtimeAtomicCondition,
  RealtimeComponentsCondition,
  RealtimeOperand,
  RealtimeOperator,
  RealtimeRule,
} from '../../types';

/**
 * Snapshot of on-screen form values keyed by their full context key
 * (e.g. `form.phone`). The mixin maintains this snapshot as the user types.
 */
export type FormSnapshot = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* type-conversion helpers — mirror the Go cutils.AnyTo* semantics       */
/* ------------------------------------------------------------------ */

export function toFloat(v: unknown): { value: number; ok: boolean } {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return { value: v, ok: true };
  }
  if (typeof v === 'boolean') {
    return { value: v ? 1 : 0, ok: true };
  }
  if (typeof v === 'string') {
    if (v.trim() === '') return { value: 0, ok: false };
    const n = Number(v);
    if (Number.isFinite(n)) return { value: n, ok: true };
  }
  return { value: 0, ok: false };
}

export function toString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  return String(v);
}

export function toBoolean(v: unknown): { value: boolean; ok: boolean } {
  if (typeof v === 'boolean') return { value: v, ok: true };
  if (typeof v === 'string') {
    if (v === 'true') return { value: true, ok: true };
    if (v === 'false') return { value: false, ok: true };
  }
  if (typeof v === 'number') {
    return { value: v !== 0, ok: true };
  }
  return { value: false, ok: false };
}

export function toSlice(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',');
  return null;
}

export function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/* ------------------------------------------------------------------ */
/* operator implementations                                             */
/* ------------------------------------------------------------------ */

type OperatorFn = (target: unknown, predicate: unknown) => boolean;

// Compiled regex cache for `matches`. Patterns come from the server (trusted),
// and the same condition is re-evaluated on every input event, so caching by
// pattern source avoids redundant RegExp construction on each keystroke.
const matchesRegexCache = new Map<string, RegExp | null>();
function compileMatchesPattern(source: string): RegExp | null {
  if (matchesRegexCache.has(source)) {
    return matchesRegexCache.get(source) ?? null;
  }
  let compiled: RegExp | null;
  try {
    compiled = new RegExp(source);
  } catch {
    compiled = null;
  }
  matchesRegexCache.set(source, compiled);
  return compiled;
}

const operators: Record<RealtimeOperator, OperatorFn> = {
  equal: (target, predicate) =>
    target === predicate || toString(target) === toString(predicate),
  'not-equal': (target, predicate) =>
    target !== predicate && toString(target) !== toString(predicate),
  contains: (target, predicate) => {
    if (Array.isArray(target)) return target.includes(predicate);
    if (typeof target === 'string') return target.includes(toString(predicate));
    return false;
  },
  'greater-than': (target, predicate) => {
    const targetNum = toFloat(target);
    const predicateNum = toFloat(predicate);
    return (
      targetNum.ok && predicateNum.ok && targetNum.value > predicateNum.value
    );
  },
  'greater-than-or-equal': (target, predicate) => {
    const targetNum = toFloat(target);
    const predicateNum = toFloat(predicate);
    return (
      targetNum.ok && predicateNum.ok && targetNum.value >= predicateNum.value
    );
  },
  'less-than': (target, predicate) => {
    const targetNum = toFloat(target);
    const predicateNum = toFloat(predicate);
    return (
      targetNum.ok && predicateNum.ok && targetNum.value < predicateNum.value
    );
  },
  'less-than-or-equal': (target, predicate) => {
    const targetNum = toFloat(target);
    const predicateNum = toFloat(predicate);
    return (
      targetNum.ok && predicateNum.ok && targetNum.value <= predicateNum.value
    );
  },
  empty: (target) => isEmpty(target),
  'not-empty': (target) => !isEmpty(target),
  'is-true': (target) => {
    const asBool = toBoolean(target);
    return asBool.ok && asBool.value;
  },
  'is-false': (target) => {
    const asBool = toBoolean(target);
    return asBool.ok && !asBool.value;
  },
  in: (target, predicate) => {
    const slice = toSlice(predicate);
    return slice !== null && slice.includes(target);
  },
  // Mirrors `in`: bad input → false, not true.
  'not-in': (target, predicate) => {
    const slice = toSlice(predicate);
    return slice !== null && !slice.includes(target);
  },
  matches: (target, predicate) => {
    if (typeof target !== 'string') return false;
    const regex = compileMatchesPattern(toString(predicate));
    return regex !== null && regex.test(target);
  },
};

/* ------------------------------------------------------------------ */
/* atomic & rule evaluation                                             */
/* ------------------------------------------------------------------ */

function resolveOperand(
  operand: RealtimeOperand | undefined,
  snapshot: FormSnapshot,
): unknown {
  if (!operand) return undefined;
  if (operand.kind === 'form' && operand.form) {
    return snapshot[operand.form];
  }
  if (operand.kind === 'list') {
    // Each item may itself be a form placeholder or a pre-resolved literal,
    // so resolve recursively. The server emits this shape when an
    // `in` / `not-in` / `contains` predicate is an array containing a
    // `{{form.X}}` reference to an on-screen key.
    return (operand.items ?? []).map((item) => resolveOperand(item, snapshot));
  }
  return operand.value;
}

function evaluateAtomic(
  atom: RealtimeAtomicCondition,
  snapshot: FormSnapshot,
): boolean {
  const fn = operators[atom.operator as RealtimeOperator];
  if (!fn) return false;

  const target = resolveOperand(atom.target, snapshot);
  const predicate = resolveOperand(atom.predicate, snapshot);
  return fn(target, predicate);
}

function evaluateRule(rule: RealtimeRule, snapshot: FormSnapshot): boolean {
  const atomics = rule.atomicConditions ?? [];
  if (!atomics.length) return false;
  if (rule.logicalOr) {
    return atomics.some((a) => evaluateAtomic(a, snapshot));
  }
  return atomics.every((a) => evaluateAtomic(a, snapshot));
}

/** Evaluates a single condition group: returns true if any of its rules fire. */
export function evaluateCondition(
  condition: RealtimeComponentsCondition,
  snapshot: FormSnapshot,
): boolean {
  return (condition.rules ?? []).some((r) => evaluateRule(r, snapshot));
}

/**
 * Evaluates all condition groups and returns, for each targeted component, the
 * action of the LAST firing group. Components where no group fires are absent
 * from the result.
 *
 * "Last match wins" mirrors the BE evaluator: when two groups target the same
 * component with different actions, the BE assigns
 * `componentsState[id] = cc.Then.Action` unconditionally in declaration order,
 * so a later CC's action overwrites an earlier one. The SDK matches this so
 * the two layers can't disagree on which action a component ends up with.
 */
export function evaluateAll(
  conditions: RealtimeComponentsCondition[] | undefined,
  snapshot: FormSnapshot,
): Record<string, string> {
  const result: Record<string, string> = {};
  (conditions ?? []).forEach((c) => {
    if (!evaluateCondition(c, snapshot)) return;
    (c.componentIds ?? []).forEach((id) => {
      result[id] = c.action;
    });
  });
  return result;
}

/**
 * Returns the set of component IDs targeted by any condition group. The
 * applier uses this to know which components belong to the realtime layer.
 */
export function collectTouchedComponentIds(
  conditions: RealtimeComponentsCondition[] | undefined,
): Set<string> {
  const out = new Set<string>();
  (conditions ?? []).forEach((c) => {
    (c.componentIds ?? []).forEach((id) => out.add(id));
  });
  return out;
}

/**
 * Returns every form key (e.g. `form.phone`) referenced by any operand in
 * any rule. The mixin uses this on mount to know which DOM inputs to read so
 * it can seed the snapshot from rendered defaults that the server can't see.
 */
export function collectReferencedFormKeys(
  conditions: RealtimeComponentsCondition[] | undefined,
): Set<string> {
  const out = new Set<string>();
  const walkOperand = (operand: RealtimeOperand | undefined) => {
    if (!operand) return;
    if (operand.kind === 'form' && operand.form) {
      out.add(operand.form);
    } else if (operand.kind === 'list') {
      (operand.items ?? []).forEach(walkOperand);
    }
  };
  (conditions ?? []).forEach((c) =>
    (c.rules ?? []).forEach((r) =>
      (r.atomicConditions ?? []).forEach((a) => {
        walkOperand(a.target);
        walkOperand(a.predicate);
      }),
    ),
  );
  return out;
}
