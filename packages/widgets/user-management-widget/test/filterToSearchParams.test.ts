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
});
