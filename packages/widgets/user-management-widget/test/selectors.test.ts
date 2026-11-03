import { getUsersList } from '../src/lib/widget/state/selectors';
import { initialState } from '../src/lib/widget/state/initialState';
import { State } from '../src/lib/widget/state/types';

const now = () => Math.floor(Date.now() / 1000);

const lockDisplay = (user: Record<string, unknown>): string => {
  const state = {
    ...initialState,
    usersList: { ...initialState.usersList, data: [{ userId: 'u1', ...user }] },
  } as unknown as State;
  return getUsersList(state)[0].lockReasonFormatted;
};

describe('getUsersList lockReasonFormatted', () => {
  it('shows a temporary lock while it is in effect, whatever the status', () => {
    expect(
      lockDisplay({
        status: 'enabled',
        lockReason: 'password',
        tempLockExpiration: now() + 600,
      }),
    ).toBe('Temp. Locked - Passwords');
    // an admin disable during a temp lock still reads as temporary
    expect(
      lockDisplay({
        status: 'disabled',
        lockReason: 'recovery_codes',
        tempLockExpiration: now() + 600,
      }),
    ).toBe('Temp. Locked - Recovery Codes');
  });

  it('shows a policy lock: disabled with a reason and no expiration', () => {
    expect(
      lockDisplay({
        status: 'disabled',
        lockReason: 'totp',
        tempLockExpiration: 0,
      }),
    ).toBe('Locked - TOTP');
    expect(
      lockDisplay({ status: 'disabled', lockReason: 'security_questions' }),
    ).toBe('Locked - Security Questions');
  });

  it('shows nothing otherwise', () => {
    // admin disable after a temp lock expired is not a policy lock
    expect(
      lockDisplay({
        status: 'disabled',
        lockReason: 'password',
        tempLockExpiration: now() - 600,
      }),
    ).toBe('');
    // admin disable without a reason
    expect(lockDisplay({ status: 'disabled', lockReason: '' })).toBe('');
    // a leftover reason on an enabled user
    expect(
      lockDisplay({
        status: 'enabled',
        lockReason: 'password',
        tempLockExpiration: 0,
      }),
    ).toBe('');
    expect(lockDisplay({ status: 'enabled' })).toBe('');
  });
});
