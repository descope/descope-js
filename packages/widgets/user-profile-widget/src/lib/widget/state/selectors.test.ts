import { getUserCustomAttrs } from './selectors';
import { State } from './types';

const makeState = (customAttributes?: Record<string, any>): State =>
  ({
    me: { data: { customAttributes } },
  }) as unknown as State;

describe('user-profile selectors', () => {
  describe('getUserCustomAttrs', () => {
    it('returns an empty object when the user has no custom attributes', () => {
      expect(getUserCustomAttrs(makeState(undefined))).toEqual({});
    });

    it('returns the custom attributes when present', () => {
      const attrs = { mailSubscription: true };
      expect(getUserCustomAttrs(makeState(attrs))).toEqual(attrs);
    });
  });
});
