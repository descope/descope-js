import {
  getIsRolesSelected,
  getIsSingleRolesSelected,
  getSelectedRoles,
} from './selectors';
import { State } from './types';

const makeState = (
  selectedRolesIds: string[],
  rolesData: Array<Record<string, any>> = [],
): State =>
  ({
    rolesList: { data: rolesData },
    selectedRolesIds,
  }) as unknown as State;

describe('role selectors', () => {
  describe('getIsSingleRolesSelected', () => {
    it('is false when nothing is selected', () => {
      expect(getIsSingleRolesSelected(makeState([]))).toBe(false);
    });

    it('is true when exactly one role is selected', () => {
      expect(getIsSingleRolesSelected(makeState(['Role 1']))).toBe(true);
    });

    it('is false when more than one role is selected', () => {
      expect(getIsSingleRolesSelected(makeState(['Role 1', 'Role 2']))).toBe(
        false,
      );
    });
  });

  describe('getIsRolesSelected', () => {
    it('is false when nothing is selected', () => {
      expect(getIsRolesSelected(makeState([]))).toBe(false);
    });

    it('is true when at least one role is selected', () => {
      expect(getIsRolesSelected(makeState(['Role 1']))).toBe(true);
      expect(getIsRolesSelected(makeState(['Role 1', 'Role 2']))).toBe(true);
    });
  });

  describe('getSelectedRoles', () => {
    const roles = [
      {
        name: 'Role 1',
        description: 'd1',
        permissionNames: ['p1'],
        tenantId: 't1',
      },
      {
        name: 'Role 2',
        description: 'd2',
        permissionNames: ['p2'],
        tenantId: 't1',
      },
    ];

    it('returns roles matching the selected ids (by name)', () => {
      const selected = getSelectedRoles(makeState(['Role 2'], roles));
      expect(selected).toHaveLength(1);
      expect(selected[0].name).toBe('Role 2');
      expect(selected[0].permissionNames).toEqual(['p2']);
    });

    it('returns empty when no selection', () => {
      expect(getSelectedRoles(makeState([], roles))).toEqual([]);
    });
  });
});
