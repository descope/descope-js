import '@testing-library/jest-dom';
import { FilterColumn } from '@descope/sdk-component-drivers';
import { CustomAttr, Role } from '../src/lib/widget/api/types';
import {
  applyRolesColumn,
  enrichCustomAttributeCol,
  enrichCustomAttributeCols,
} from '../src/lib/widget/helpers/filterColumns';

const col = (over: Partial<FilterColumn>): FilterColumn =>
  ({ id: 'customAttributes.dept', label: '', ...over }) as FilterColumn;

describe('enrichCustomAttributeCol', () => {
  it('returns the column unchanged when the attribute is missing or schema is absent', () => {
    const input = col({ inputType: 'text', operators: ['equal'] });
    expect(enrichCustomAttributeCol(input, [])).toBe(input);
    expect(enrichCustomAttributeCol(input, undefined)).toBe(input);
  });

  it('trusts the published inputType/operators (does not re-derive them)', () => {
    const input = col({ inputType: 'boolean', operators: ['equal'] });
    const out = enrichCustomAttributeCol(input, [
      { name: 'dept', type: 3, options: [], displayName: 'Dept' } as CustomAttr,
    ]);
    expect(out.inputType).toBe('boolean');
    expect(out.operators).toEqual(['equal']);
  });

  it('passes through select options ({value,label}) from the schema', () => {
    const out = enrichCustomAttributeCol(
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
    const out = enrichCustomAttributeCol(
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
    const out = enrichCustomAttributeCol(col({ label: 'Dept' }), [
      { name: 'dept', type: 1, options: [], displayName: 'Dept' } as CustomAttr,
    ]);
    expect('options' in out).toBe(false);
  });

  it('backfills the label from displayName, then attr name, only when empty', () => {
    const fromDisplay = enrichCustomAttributeCol(col({ label: '' }), [
      {
        name: 'dept',
        type: 1,
        options: [],
        displayName: 'Department',
      } as CustomAttr,
    ]);
    expect(fromDisplay.label).toBe('Department');

    const fromName = enrichCustomAttributeCol(col({ label: '' }), [
      { name: 'dept', type: 1, options: [], displayName: '' } as CustomAttr,
    ]);
    expect(fromName.label).toBe('dept');

    const kept = enrichCustomAttributeCol(col({ label: 'Custom' }), [
      {
        name: 'dept',
        type: 1,
        options: [],
        displayName: 'Department',
      } as CustomAttr,
    ]);
    expect(kept.label).toBe('Custom');
  });
});

describe('enrichCustomAttributeCols', () => {
  it('enriches only custom-attribute columns; passes non-CA and nullish entries through', () => {
    const status = col({ id: 'status', label: 'Status' });
    const ca = col({ id: 'customAttributes.tier', label: '' });
    const nully = null as unknown as FilterColumn;
    const out = enrichCustomAttributeCols(
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

describe('applyRolesColumn', () => {
  const roles = col({ id: 'roles', label: 'Roles' });
  const status = col({ id: 'status', label: 'Status' });
  const nully = null as unknown as FilterColumn;

  it('drops the roles column when there are no tenant roles (keeping nullish entries)', () => {
    expect(applyRolesColumn([status, nully, roles], [])).toEqual([
      status,
      nully,
    ]);
    expect(applyRolesColumn([status, roles], undefined)).toEqual([status]);
  });

  it('populates roles options from the tenant role list; leaves other/nullish entries', () => {
    const out = applyRolesColumn(
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
