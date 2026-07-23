import {
  pathJoin,
  compareArrays,
  withMemCache,
  kebabCase,
  isObjEmpty,
  pluralize,
  debounce,
  isPlainObject,
} from '../src';

describe('generic helpers', () => {
  describe('pathJoin', () => {
    it('should join paths with single slash', () => {
      expect(pathJoin('a', 'b', 'c')).toBe('a/b/c');
    });

    it('should remove duplicate slashes', () => {
      expect(pathJoin('a/', '/b', '//c')).toBe('a/b/c');
    });

    it('should handle empty strings', () => {
      expect(pathJoin('', 'a', '', 'b')).toBe('/a/b');
    });

    it('should handle single path', () => {
      expect(pathJoin('path')).toBe('path');
    });

    it('should handle leading and trailing slashes', () => {
      expect(pathJoin('/api/', '/users/', '/list/')).toBe('/api/users/list/');
    });
  });

  describe('compareArrays', () => {
    it('should return true for identical arrays', () => {
      expect(compareArrays([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('should return false for arrays with different lengths', () => {
      expect(compareArrays([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should return false for arrays with different values', () => {
      expect(compareArrays([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('should return true for empty arrays', () => {
      expect(compareArrays([], [])).toBe(true);
    });

    it('should handle arrays with mixed types', () => {
      expect(compareArrays([1, 'a', true], [1, 'a', true])).toBe(true);
      expect(compareArrays([1, 'a', true], [1, 'a', false])).toBe(false);
    });

    it('should handle arrays with objects (reference equality)', () => {
      const obj = { a: 1 };
      expect(compareArrays([obj], [obj])).toBe(true);
      expect(compareArrays([{ a: 1 }], [{ a: 1 }])).toBe(false);
    });
  });

  describe('withMemCache', () => {
    it('should recalculate for different arguments', () => {
      let callCount = 0;
      const fn = withMemCache((a: number, b: number) => {
        callCount++;
        return a + b;
      });

      expect(fn(1, 2)).toBe(3);
      expect(callCount).toBe(1);

      expect(fn(2, 3)).toBe(5);
      expect(callCount).toBe(2);
    });

    it('should handle no arguments', () => {
      let callCount = 0;
      const fn = withMemCache(() => {
        callCount++;
        return 'result';
      });

      expect(fn()).toBe('result');
      expect(callCount).toBe(1);

      expect(fn()).toBe('result');
      expect(callCount).toBe(1);
    });

    it('should handle functions returning objects', () => {
      let callCount = 0;
      const fn = withMemCache((key: string) => {
        callCount++;
        return { key, value: Math.random() };
      });

      const result1 = fn('test');
      expect(callCount).toBe(1);

      const result2 = fn('test');
      expect(callCount).toBe(1);
      expect(result1).toBe(result2); // Same object reference
    });
  });

  describe('kebabCase', () => {
    it('should handle multiple consecutive separators', () => {
      expect(kebabCase('multiple___underscores')).toBe('multiple-underscores');
      expect(kebabCase('multiple   spaces')).toBe('multiple-spaces');
    });

    it('should convert to lowercase', () => {
      expect(kebabCase('UPPERCASE')).toBe('uppercase');
    });

    it('should handle mixed formats', () => {
      expect(kebabCase('someVariableName_withUnderscore')).toBe(
        'some-variable-name-with-underscore',
      );
    });

    it('should handle single word', () => {
      expect(kebabCase('word')).toBe('word');
    });

    it('should handle empty string', () => {
      expect(kebabCase('')).toBe('');
    });
  });

  describe('isObjEmpty', () => {
    it('should return true for empty object', () => {
      expect(isObjEmpty({})).toBe(true);
    });

    it('should return false for object with properties', () => {
      expect(isObjEmpty({ a: 1 })).toBe(false);
    });

    it('should return true for Object.create(null) with no properties', () => {
      const obj = Object.create(Object.prototype);
      expect(isObjEmpty(obj)).toBe(true);
    });

    it('should handle objects with undefined values', () => {
      expect(isObjEmpty({ a: undefined })).toBe(false);
    });
  });

  describe('pluralize', () => {
    it('should return singular for amount = 1', () => {
      const p = pluralize(1);
      expect(p`${['item', 'items']}`).toBe('item');
    });

    it('should return plural for amount > 1', () => {
      const p = pluralize(2);
      expect(p`${['item', 'items']}`).toBe('items');
    });

    it('should return plural for amount = 0', () => {
      const p = pluralize(0);
      expect(p`${['item', 'items']}`).toBe('item');
    });

    it('should handle numbers in template', () => {
      const count = 5;
      const p = pluralize(count);
      expect(
        p`${[count.toString(), count.toString()]} ${['item', 'items']}`,
      ).toBe('5 items');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 500);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 500);

      debounced();
      debounced();
      debounced();

      jest.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the function', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 500);

      debounced('arg1', 'arg2');
      jest.advanceTimersByTime(500);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve this context', () => {
      let capturedThis: any;
      const obj = {
        value: 42,
        fn: function (this: any) {
          capturedThis = this;
          return this.value;
        },
      };
      const originalFn = obj.fn;
      obj.fn = debounce(obj.fn, 500) as any;

      obj.fn();
      jest.advanceTimersByTime(500);

      expect(capturedThis).toBe(obj);
      expect(capturedThis.value).toBe(42);
    });

    it('should use default delay of 500ms', () => {
      const fn = jest.fn();
      const debounced = debounce(fn);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(499);
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1, b: 2 })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isPlainObject(42)).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(true)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
    });

    it('should return false for functions', () => {
      expect(isPlainObject(() => {})).toBe(false);
      expect(isPlainObject(function () {})).toBe(false);
    });

    it('should return false for class instances', () => {
      class TestClass {}
      expect(isPlainObject(new TestClass())).toBe(false);
    });

    it('should return false for built-in objects', () => {
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(/test/)).toBe(false);
      expect(isPlainObject(new Map())).toBe(false);
      expect(isPlainObject(new Set())).toBe(false);
    });

    it('should return false for Object.create(null)', () => {
      expect(isPlainObject(Object.create(null))).toBe(false);
    });

    it('should return true for Object.create(Object.prototype)', () => {
      expect(isPlainObject(Object.create(Object.prototype))).toBe(true);
    });
  });
});
