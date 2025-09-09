import { calculateCondition } from '../../src/lib/helpers/conditions';
import { ClientCondition } from '../../src/lib/types';

describe('conditions', () => {
  describe('calculateCondition', () => {
    const mockContext = {
      loginId: 'testLoginId',
      code: 'testCode',
      token: 'testToken',
      abTestingKey: 50,
    };

    it('should handle lastAuth.loginId with not-empty operator', () => {
      const condition = {
        key: 'lastAuth.loginId',
        operator: 'not-empty',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle lastAuth.loginId with empty operator', () => {
      const condition = {
        key: 'lastAuth.loginId',
        operator: 'empty',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(
        calculateCondition(condition, { ...mockContext, loginId: '' }),
      ).toEqual(expect.objectContaining({ startScreenId: 'screen1' }));
    });

    it('should handle lastAuth.loginId with not-empty operator from lastAuth context', () => {
      const condition = {
        key: 'lastAuth.loginId',
        operator: 'not-empty',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(
        calculateCondition(condition, {
          lastAuth: { loginId: mockContext.loginId },
        }),
      ).toEqual(expect.objectContaining({ startScreenId: 'screen1' }));
    });

    it('should handle lastAuth.loginId with empty operator from lastAuth context', () => {
      const condition = {
        key: 'lastAuth.loginId',
        operator: 'empty',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(
        calculateCondition(condition, { lastAuth: { loginId: '' } }),
      ).toEqual(expect.objectContaining({ startScreenId: 'screen1' }));
    });

    it('should handle idpInitiated with is-true operator', () => {
      const condition = {
        key: 'idpInitiated',
        operator: 'is-true',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle idpInitiated with is-false operator', () => {
      const condition = {
        key: 'idpInitiated',
        operator: 'is-false',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(
        calculateCondition(condition, { ...mockContext, code: '' }),
      ).toEqual(expect.objectContaining({ startScreenId: 'screen1' }));
    });

    it('should handle externalToken with is-true operator', () => {
      const condition = {
        key: 'externalToken',
        operator: 'is-true',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle externalToken with is-false operator', () => {
      const condition = {
        key: 'externalToken',
        operator: 'is-false',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(
        calculateCondition(condition, { ...mockContext, token: '' }),
      ).toEqual(expect.objectContaining({ startScreenId: 'screen1' }));
    });

    it('should handle abTestingKey with greater-than operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'greater-than',
        predicate: 40,
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with in-range operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'in-range',
        predicate: '30,60',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with devised-by operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'devised-by',
        predicate: '10',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with less-than operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'less-than',
        predicate: 60,
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with greater-than-or-equal operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'greater-than-or-equal',
        predicate: 50,
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with less-than-or-equal operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'less-than-or-equal',
        predicate: 50,
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with not-in-range operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'not-in-range',
        predicate: '30,40',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen1' }),
      );
    });

    it('should handle abTestingKey with devised-by operator (unmet case)', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'devised-by',
        predicate: '7',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen2' }),
      );
    });

    it('should handle invalid predicate for devised-by operator', () => {
      const condition = {
        key: 'abTestingKey',
        operator: 'devised-by',
        predicate: 'invalid',
        met: { screenId: 'screen1' },
        unmet: { screenId: 'screen2' },
      } as ClientCondition;
      expect(calculateCondition(condition, mockContext)).toEqual(
        expect.objectContaining({ startScreenId: 'screen2' }),
      );
    });
  });
});
