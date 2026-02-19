import '@testing-library/jest-dom';
import {
  getEmailBadgeLabel,
  getPhoneBadgeLabel,
} from '../src/lib/widget/state/selectors';
import { State } from '../src/lib/widget/state/types';

describe('Badge Visibility Logic', () => {
  // Helper to create minimal valid state
  const createBaseState = (): State => ({
    me: {
      loading: false,
      error: null,
      data: {},
    },
    devices: {
      loading: false,
      error: null,
      data: [],
    },
    tenant: {
      currentTenantId: null,
      previousTenantId: null,
    },
    selectTenant: {
      loading: false,
      error: null,
    },
    notifications: [],
  });

  describe('Email Badge', () => {
    const createStateWithEmail = (
      email: string,
      verifiedEmail: boolean,
    ): State => ({
      ...createBaseState(),
      me: {
        loading: false,
        error: null,
        data: {
          email,
          verifiedEmail,
        },
      },
    });

    it('should show "Unverified" badge when email exists and is not verified', () => {
      const state = createStateWithEmail('test@example.com', false);
      const badgeLabel = getEmailBadgeLabel(state);

      expect(badgeLabel).toBe('Unverified');
    });

    it('should NOT show badge when email is empty', () => {
      const state = createStateWithEmail('', false);
      const badgeLabel = getEmailBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should NOT show badge when email is only whitespace', () => {
      const state = createStateWithEmail('   ', false);
      const badgeLabel = getEmailBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should NOT show badge when email is verified', () => {
      const state = createStateWithEmail('test@example.com', true);
      const badgeLabel = getEmailBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should NOT show badge when email is undefined', () => {
      const state = createStateWithEmail(undefined as any, false);
      const badgeLabel = getEmailBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should show "Unverified" badge when email has leading/trailing whitespace but content', () => {
      const state = createStateWithEmail('  test@example.com  ', false);
      const badgeLabel = getEmailBadgeLabel(state);

      expect(badgeLabel).toBe('Unverified');
    });
  });

  describe('Phone Badge', () => {
    const createStateWithPhone = (
      phone: string,
      verifiedPhone: boolean,
    ): State => ({
      ...createBaseState(),
      me: {
        loading: false,
        error: null,
        data: {
          phone,
          verifiedPhone,
        },
      },
    });

    it('should show "Unverified" badge when phone exists and is not verified', () => {
      const state = createStateWithPhone('+1234567890', false);
      const badgeLabel = getPhoneBadgeLabel(state);

      expect(badgeLabel).toBe('Unverified');
    });

    it('should NOT show badge when phone is empty', () => {
      const state = createStateWithPhone('', false);
      const badgeLabel = getPhoneBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should NOT show badge when phone is only whitespace', () => {
      const state = createStateWithPhone('   ', false);
      const badgeLabel = getPhoneBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should NOT show badge when phone is verified', () => {
      const state = createStateWithPhone('+1234567890', true);
      const badgeLabel = getPhoneBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should NOT show badge when phone is undefined', () => {
      const state = createStateWithPhone(undefined as any, false);
      const badgeLabel = getPhoneBadgeLabel(state);

      expect(badgeLabel).toBe('');
    });

    it('should show "Unverified" badge when phone has leading/trailing whitespace but content', () => {
      const state = createStateWithPhone('  +1234567890  ', false);
      const badgeLabel = getPhoneBadgeLabel(state);

      expect(badgeLabel).toBe('Unverified');
    });
  });

  describe('Badge Visibility Truth Table', () => {
    it('should follow correct badge visibility logic for all combinations', () => {
      // Test all combinations of (hasValue, isVerified) -> expectedBadge
      const testCases = [
        // [hasValue, isVerified, expectedBadge, description]
        [false, false, '', 'No value, not verified -> no badge'],
        [false, true, '', 'No value, verified -> no badge'],
        [true, false, 'Unverified', 'Has value, not verified -> show badge'],
        [true, true, '', 'Has value, verified -> no badge'],
      ] as const;

      testCases.forEach(([hasValue, isVerified, expected]) => {
        const value = hasValue ? 'test@example.com' : '';
        const state: State = {
          ...createBaseState(),
          me: {
            loading: false,
            error: null,
            data: {
              email: value,
              verifiedEmail: isVerified,
            },
          },
        };

        const badgeLabel = getEmailBadgeLabel(state);

        expect(badgeLabel).toBe(expected);
      });
    });
  });
});
