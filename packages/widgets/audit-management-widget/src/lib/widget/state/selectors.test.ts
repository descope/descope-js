import { getAuditList } from './selectors';
import { State } from './types';

const baseAudit = {
  id: 'audit-1',
  action: 'SCIMEvent',
  occurred: 1672257182000,
  type: 'info',
};

const makeState = (data: Record<string, any>): State =>
  ({
    auditList: { data: [{ ...baseAudit, data }] },
    selectedAuditId: null,
    searchParams: {},
  }) as unknown as State;

describe('getAuditList selector', () => {
  describe('SCIM fields', () => {
    it('lifts scim_request out of data and exposes it as a top-level field', () => {
      const scimRequest = { userName: 'john@example.com', displayName: 'John' };
      const state = makeState({ scim_request: scimRequest, other: 'value' });

      const [audit] = getAuditList(state);

      expect(audit.scim_request).toEqual(scimRequest);
      expect((audit.data as any).scim_request).toBeUndefined();
    });

    it('lifts scim_result out of data and exposes it as a top-level field', () => {
      const scimResult = { id: 'U123', userName: 'john@example.com' };
      const state = makeState({ scim_result: scimResult, other: 'value' });

      const [audit] = getAuditList(state);

      expect(audit.scim_result).toEqual(scimResult);
      expect((audit.data as any).scim_result).toBeUndefined();
    });

    it('lifts Change out of data and exposes it as a top-level field', () => {
      const changeData = {
        display_name: 'John Doe',
        email: 'john@example.com',
      };
      const state = makeState({ Change: changeData, other: 'value' });

      const [audit] = getAuditList(state);

      expect(audit.Change).toEqual(changeData);
      expect((audit.data as any).Change).toBeUndefined();
    });

    it('omits scim fields when absent from data', () => {
      const state = makeState({ other: 'value' });

      const [audit] = getAuditList(state);

      expect(audit).not.toHaveProperty('scim_request');
      expect(audit).not.toHaveProperty('scim_result');
      expect(audit).not.toHaveProperty('Change');
    });

    it('handles an audit with all three SCIM fields present simultaneously', () => {
      const scimRequest = { userName: 'john@example.com' };
      const scimResult = { id: 'U123' };
      const changeData = { display_name: 'John' };
      const state = makeState({
        scim_request: scimRequest,
        scim_result: scimResult,
        Change: changeData,
      });

      const [audit] = getAuditList(state);

      expect(audit.scim_request).toEqual(scimRequest);
      expect(audit.scim_result).toEqual(scimResult);
      expect(audit.Change).toEqual(changeData);
      expect(audit.data).not.toHaveProperty('scim_request');
      expect(audit.data).not.toHaveProperty('scim_result');
      expect(audit.data).not.toHaveProperty('Change');
    });
  });
});
