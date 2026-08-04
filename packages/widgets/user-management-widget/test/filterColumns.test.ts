import '@testing-library/jest-dom';
import { FilterColumn } from '@descope/sdk-component-drivers';
import { CustomAttr, Role } from '../src/lib/widget/api/types';
import {
  applyFilterRolesColumn,
  enrichFilterCustomAttributeColumns,
} from '../src/lib/widget/helpers/filterColumns';

const col = (over: Partial<FilterColumn>): FilterColumn =>
  ({ id: 'customAttributes.dept', label: '', ...over }) as FilterColumn;

// Exercise the per-column projection through the public list fn (single entry).
const enrichOne = (c: FilterColumn, cas: CustomAttr[] | undefined) =>
  enrichFilterCustomAttributeColumns([c], cas)[0];

describe('enrichFilterCustomAttributeColumns', () => {
  it('keeps the column unchanged while the schema is still loading (undefined)', () => {
    const input = col({ inputType: 'text', operators: ['equal'] });
    expect(enrichOne(input, undefined)).toBe(input);
  });

  it('drops a custom-attribute column whose attribute no longer exists', () => {
    const input = col({ id: 'customAttributes.dept', inputType: 'text' });
    // schema loaded (array) but dept is gone -> column removed
    expect(enrichFilterCustomAttributeColumns([input], [])).toEqual([]);
    expect(
      enrichFilterCustomAttributeColumns(
        [input],
        [
          {
            name: 'other',
            type: 1,
            options: [],
            displayName: 'Other',
          } as CustomAttr,
        ],
      ),
    ).toEqual([]);
  });

  it('trusts the published inputType/operators (does not re-derive them)', () => {
    const input = col({ inputType: 'boolean', operators: ['equal'] });
    const out = enrichOne(input, [
      { name: 'dept', type: 3, options: [], displayName: 'Dept' } as CustomAttr,
    ]);
    expect(out.inputType).toBe('boolean');
    expect(out.operators).toEqual(['equal']);
  });

  it('passes through select options ({value,label}) from the schema', () => {
    const out = enrichOne(
      col({ id: 'customAttributes.tier', inputType: 'singleselect' }),
      [
        {
          name: 'tier',
          type: 4,
          options: [
            { value: 'gold', label: 'Gold' },
            { value: 'silver', label: 'Silver' },
          ],
          displayName: 'Tier',
        } as CustomAttr,
      ],
    );
    expect(out.options).toEqual([
      { value: 'gold', label: 'Gold' },
      { value: 'silver', label: 'Silver' },
    ]);
  });

  it('backfills a missing option label from its value', () => {
    const out = enrichOne(
      col({ id: 'customAttributes.tier', inputType: 'singleselect' }),
      [
        {
          name: 'tier',
          type: 4,
          options: [{ value: 'gold', label: '' }],
          displayName: 'Tier',
        } as CustomAttr,
      ],
    );
    expect(out.options).toEqual([{ value: 'gold', label: 'gold' }]);
  });

  it('omits options when the attribute has none', () => {
    const out = enrichOne(col({ label: 'Dept' }), [
      { name: 'dept', type: 1, options: [], displayName: 'Dept' } as CustomAttr,
    ]);
    expect('options' in out).toBe(false);
  });

  it('backfills the label from displayName, then attr name, only when empty', () => {
    const fromDisplay = enrichOne(col({ label: '' }), [
      {
        name: 'dept',
        type: 1,
        options: [],
        displayName: 'Department',
      } as CustomAttr,
    ]);
    expect(fromDisplay.label).toBe('Department');

    const fromName = enrichOne(col({ label: '' }), [
      { name: 'dept', type: 1, options: [], displayName: '' } as CustomAttr,
    ]);
    expect(fromName.label).toBe('dept');

    const kept = enrichOne(col({ label: 'Custom' }), [
      {
        name: 'dept',
        type: 1,
        options: [],
        displayName: 'Department',
      } as CustomAttr,
    ]);
    expect(kept.label).toBe('Custom');
  });

  it('enriches only custom-attribute columns; passes non-CA and nullish entries through', () => {
    const status = col({ id: 'status', label: 'Status' });
    const ca = col({ id: 'customAttributes.tier', label: '' });
    const nully = null as unknown as FilterColumn;
    const out = enrichFilterCustomAttributeColumns(
      [status, nully, ca],
      [
        {
          name: 'tier',
          type: 4,
          options: [{ value: 'gold', label: 'Gold' }],
          displayName: 'Tier',
        } as CustomAttr,
      ],
    );
    expect(out[0]).toBe(status); // untouched
    expect(out[1]).toBeNull(); // nullish passthrough
    expect(out[2].label).toBe('Tier');
    expect(out[2].options).toEqual([{ value: 'gold', label: 'Gold' }]);
  });
});

describe('applyFilterRolesColumn', () => {
  const roles = col({ id: 'roles', label: 'Roles' });
  const status = col({ id: 'status', label: 'Status' });
  const nully = null as unknown as FilterColumn;

  it('drops the roles column when there are no tenant roles (keeping nullish entries)', () => {
    expect(applyFilterRolesColumn([status, nully, roles], [])).toEqual([
      status,
      nully,
    ]);
    expect(applyFilterRolesColumn([status, roles], undefined)).toEqual([
      status,
    ]);
  });

  it('populates roles options from the tenant role list; leaves other/nullish entries', () => {
    const out = applyFilterRolesColumn(
      [status, nully, roles],
      [{ name: 'Admin' } as Role, { name: 'Reader' } as Role],
    );
    expect(out[0]).toBe(status);
    expect(out[1]).toBeNull();
    expect(out[2].options).toEqual([
      { value: 'Admin', label: 'Admin' },
      { value: 'Reader', label: 'Reader' },
    ]);
  });
});
