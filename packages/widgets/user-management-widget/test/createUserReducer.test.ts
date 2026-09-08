import { createReducer } from '@reduxjs/toolkit';
import { createUser } from '../src/lib/widget/state/asyncActions/createUser';
import { initialState } from '../src/lib/widget/state/initialState';
import { State } from '../src/lib/widget/state/types';
import { User } from '../src/lib/widget/api/types';

// Build a standalone reducer that only knows the createUser cases, so we can
// drive it with createUser.action.fulfilled(...) against the widget's
// initialState.
const reducer = createReducer(initialState, (builder) =>
  createUser.reducer(builder),
);

const makeUser = (userId: string, loginId: string): User =>
  ({
    userId,
    loginIds: [loginId],
    status: 'invited',
  }) as User;

const fulfilled = (state: State, payload: User) =>
  reducer(state, createUser.action.fulfilled(payload, 'req-id', {} as any));

describe('createUser reducer', () => {
  it('prepends a brand-new user to the list', () => {
    const user = makeUser('u1', 'a@test.com');

    const state = fulfilled(initialState, user);

    expect(state.usersList.data).toHaveLength(1);
    expect(state.usersList.data[0]).toEqual(user);
  });

  it('does not duplicate a user re-invited with the same login id', () => {
    const user = makeUser('u1', 'a@test.com');

    let state = fulfilled(initialState, user);
    // Re-invite: backend returns the same user (same userId).
    const reinvited = { ...user, status: 'invited' } as User;
    state = fulfilled(state, reinvited);

    expect(state.usersList.data).toHaveLength(1);
    expect(state.usersList.data[0]).toEqual(reinvited);
  });

  it('replaces a re-invited user in place without moving it to the top', () => {
    const first = makeUser('u1', 'a@test.com');
    const second = makeUser('u2', 'b@test.com');

    let state = fulfilled(initialState, first);
    state = fulfilled(state, second); // second is now at the top, first at index 1

    // Re-invite the older user (not at the head).
    const reinvitedFirst = { ...first, status: 'invited' } as User;
    state = fulfilled(state, reinvitedFirst);

    expect(state.usersList.data).toHaveLength(2);
    expect(state.usersList.data[0]).toEqual(second);
    expect(state.usersList.data[1]).toEqual(reinvitedFirst);
  });

  it('prepends a different user without touching the existing one', () => {
    const first = makeUser('u1', 'a@test.com');
    const second = makeUser('u2', 'b@test.com');

    let state = fulfilled(initialState, first);
    state = fulfilled(state, second);

    expect(state.usersList.data).toHaveLength(2);
    expect(state.usersList.data[0]).toEqual(second);
    expect(state.usersList.data[1]).toEqual(first);
  });

  it('still fires success notification and clears loading on re-invite', () => {
    const user = makeUser('u1', 'a@test.com');

    let state = fulfilled(initialState, user);
    state = fulfilled(state, user);

    expect(state.createUser.loading).toBe(false);
    expect(
      state.notifications.filter((n) => n.type === 'success'),
    ).toHaveLength(2);
  });
});
