import { compose } from '../src';

describe('compose', () => {
  it('should compose two functions', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;

    const composed = compose(addOne, double);

    expect(composed(5)).toBe(12); // (5 + 1) * 2
  });

  it('should compose three functions', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const square = (x: number) => x * x;

    const composed = compose(addOne, double, square);

    expect(composed(3)).toBe(64); // ((3 + 1) * 2) ^ 2 = 8 ^ 2 = 64
  });

  it('should handle single function', () => {
    const addOne = (x: number) => x + 1;

    const composed = compose(addOne);

    expect(composed(5)).toBe(6);
  });

  it('should compose functions with different types', () => {
    const numToString = (x: number) => x.toString();
    const addExclamation = (s: string) => s + '!';
    const toUpperCase = (s: string) => s.toUpperCase();

    const composed = compose(numToString, addExclamation, toUpperCase);

    expect(composed(42)).toBe('42!');
  });

  it('should compose functions with object transformations', () => {
    type User = { name: string };
    type UserWithId = User & { id: number };
    type UserWithTimestamp = UserWithId & { timestamp: number };

    const addId = (user: User): UserWithId => ({ ...user, id: 1 });
    const addTimestamp = (user: UserWithId): UserWithTimestamp => ({
      ...user,
      timestamp: Date.now(),
    });

    const composed = compose(addId, addTimestamp);
    const result = composed({ name: 'John' });

    expect(result.name).toBe('John');
    expect(result.id).toBe(1);
    expect(result.timestamp).toBeDefined();
  });

  it('should execute functions in correct order (left to right)', () => {
    const log: string[] = [];
    const fn1 = (x: number) => {
      log.push('fn1');
      return x + 1;
    };
    const fn2 = (x: number) => {
      log.push('fn2');
      return x * 2;
    };
    const fn3 = (x: number) => {
      log.push('fn3');
      return x - 3;
    };

    const composed = compose(fn1, fn2, fn3);
    composed(5);

    expect(log).toEqual(['fn1', 'fn2', 'fn3']);
  });

  it('should preserve type safety through composition chain', () => {
    const parseNumber = (s: string): number => parseInt(s, 10);
    const isEven = (n: number): boolean => n % 2 === 0;
    const boolToString = (b: boolean): string => (b ? 'yes' : 'no');

    const composed = compose(parseNumber, isEven, boolToString);

    expect(composed('42')).toBe('yes');
    expect(composed('43')).toBe('no');
  });
});
