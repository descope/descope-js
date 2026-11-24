import { getAccessKeysList } from '../src/lib/widget/state/selectors';
import type { State } from '../src/lib/widget/state/types';

const baseKey = {
  id: '1',
  name: 'k',
  roleNames: [],
  permittedIps: [],
  status: 'active',
  createdTime: 0,
  expireTime: 0,
  createdBy: '',
  clientId: '',
  editable: true,
  boundUserId: '',
};

const stateWith = (customAttributes: Record<string, unknown>) =>
  ({
    accessKeysList: { data: [{ ...baseKey, customAttributes }] },
  }) as unknown as State;

describe('getAccessKeysList custom attributes', () => {
  it('exposes custom attributes under flat `customAttributes.<name>` keys', () => {
    const [row] = getAccessKeysList(stateWith({ team: 'ops' }));
    expect(row['customAttributes.team']).toBe('ops');
  });

  it('stringifies booleans so `false` is not an empty grid cell', () => {
    const [row] = getAccessKeysList(stateWith({ active: false, admin: true }));
    expect(row['customAttributes.active']).toBe('false');
    expect(row['customAttributes.admin']).toBe('true');
  });
});
