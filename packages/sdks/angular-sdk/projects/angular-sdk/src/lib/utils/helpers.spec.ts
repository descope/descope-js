import { observabilify, Observablefied } from './helpers';
import { lastValueFrom, Observable } from 'rxjs';

describe('Helpers', () => {
  describe('Observabilify', () => {
    it('should not affect simple object', () => {
      //GIVEN
      const obj = {
        field1: 'string',
        field2: 123,
        nested: {
          field1: 'string',
          field2: 123
        }
      };
      type TestType = typeof obj;

      //WHEN
      const result: Observablefied<TestType> = observabilify<TestType>(obj);

      //THEN
      expect(result).toStrictEqual(obj);
    });

    it('should not affect simple object with non async functions', () => {
      //GIVEN
      const obj = {
        field1: 'string',
        field2: 123,
        fn: (arg1: string, arg2: number): string => {
          return arg1 + arg2.toString();
        },
        nested: {
          fn2: (arg: string): string => {
            return arg;
          },
          field1: 'string',
          field2: 123
        }
      };
      type TestType = typeof obj;
      const expected1 = obj.fn('Test', 1);
      const expected2 = obj.nested.fn2('Test');

      //WHEN
      const transformed: Observablefied<TestType> =
        observabilify<TestType>(obj);
      const actual1 = transformed.fn('Test', 1);
      const actual2 = transformed.nested.fn2('Test');

      //THEN
      expect(expected1).toStrictEqual(actual1);
      expect(expected2).toStrictEqual(actual2);
    });

    it('should transform async functions', async () => {
      //GIVEN
      const obj = {
        field1: 'string',
        field2: 123,
        fn: (arg1: string, arg2: number): string => {
          return arg1 + arg2.toString();
        },
        asyncFn: (arg1: string, arg2: number): Promise<string> => {
          return Promise.resolve(arg1 + arg2.toString());
        },
        nested: {
          fn2: (arg: string) => {
            return arg;
          },
          asyncFn: (arg: string): Promise<string> => {
            return Promise.resolve(arg);
          },
          field1: 'string',
          field2: 123
        }
      };
      type TestType = typeof obj;
      const expected1 = obj.fn('Test', 1);
      const expected2 = obj.nested.fn2('Test');
      const expected3 = await obj.asyncFn('Test', 1);
      const expected4 = await obj.nested.asyncFn('Test');

      //WHEN
      const transformed: Observablefied<TestType> =
        observabilify<TestType>(obj);
      const actual1 = transformed.fn('Test', 1);
      const actual2 = transformed.nested.fn2('Test');
      const actual3Async = transformed.asyncFn('Test', 1);
      const actual3 = await lastValueFrom(actual3Async);
      const actual4Async = transformed.nested.asyncFn('Test');
      const actual4 = await lastValueFrom(actual4Async);

      //THEN
      expect(expected1).toStrictEqual(actual1);
      expect(expected2).toStrictEqual(actual2);
      expect(actual3Async).toBeInstanceOf(Observable);
      expect(actual4Async).toBeInstanceOf(Observable);
      expect(expected3).toStrictEqual(actual3);
      expect(expected4).toStrictEqual(actual4);
    });
  });
});
