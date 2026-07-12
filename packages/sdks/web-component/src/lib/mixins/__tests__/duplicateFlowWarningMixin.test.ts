import {
  getSameFlowInstances,
  isDuplicateSameFlowInstance,
} from '../duplicateFlowWarningMixin';

const mountWc = (projectId?: string, flowId?: string): Element => {
  const el = document.createElement('descope-wc');
  if (projectId !== undefined) el.setAttribute('project-id', projectId);
  if (flowId !== undefined) el.setAttribute('flow-id', flowId);
  document.body.appendChild(el);
  return el;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('duplicateFlowWarningMixin detection', () => {
  it('flags the second (non-first) of two same project+flow instances, not the first', () => {
    const a = mountWc('p1', 'sign-in');
    const b = mountWc('p1', 'sign-in');

    expect(getSameFlowInstances(a)).toHaveLength(2);
    expect(isDuplicateSameFlowInstance(a)).toBe(false); // first → no warning
    expect(isDuplicateSameFlowInstance(b)).toBe(true); // duplicate → warns
  });

  it('flags every duplicate after the first (one warning per extra instance)', () => {
    const a = mountWc('p1', 'sign-in');
    const b = mountWc('p1', 'sign-in');
    const c = mountWc('p1', 'sign-in');

    expect([a, b, c].map(isDuplicateSameFlowInstance)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('does not flag a single instance', () => {
    const a = mountWc('p1', 'sign-in');
    expect(isDuplicateSameFlowInstance(a)).toBe(false);
  });

  it('does not flag same project but different flow', () => {
    const a = mountWc('p1', 'sign-in');
    const b = mountWc('p1', 'sign-up');
    expect(isDuplicateSameFlowInstance(a)).toBe(false);
    expect(isDuplicateSameFlowInstance(b)).toBe(false);
  });

  it('does not flag same flow but different project', () => {
    const a = mountWc('p1', 'sign-in');
    const b = mountWc('p2', 'sign-in');
    expect(isDuplicateSameFlowInstance(a)).toBe(false);
    expect(isDuplicateSameFlowInstance(b)).toBe(false);
  });

  it('ignores instances missing project-id or flow-id', () => {
    const noProject = mountWc(undefined, 'sign-in');
    const noFlow = mountWc('p1', undefined);
    mountWc('p1', 'sign-in');

    expect(getSameFlowInstances(noProject)).toHaveLength(0);
    expect(isDuplicateSameFlowInstance(noProject)).toBe(false);
    expect(isDuplicateSameFlowInstance(noFlow)).toBe(false);
  });
});
