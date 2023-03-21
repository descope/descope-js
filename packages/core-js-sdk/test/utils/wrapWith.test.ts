import { ResponseData, SdkResponse } from '../../src/sdk/types';
import { wrapWith } from '../../src/utils';
import { SdkFn, SdkFnWrapper } from '../../src/utils/wrapWith/types';

const obj = {
  a: {
    fn: jest.fn((x: number) => {
      return { x } as unknown as SdkResponse<ResponseData>;
    }) as unknown as SdkFn<ResponseData>,
  },
};

describe('wrapWith', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should wrap fn with wrapper and return correct value', () => {
    const wrapper = jest.fn((fn) => async (...args) => {
      const ret = await fn(...args);

      return { ...ret, y: 2 };
    }) as SdkFnWrapper<{ y: number }>;

    const wrapped = wrapWith(obj, ['a.fn'], wrapper);

    expect(wrapped.a.fn(1)).resolves.toEqual({ x: 1, y: 2 });
  });

  it('should wrap fn with wrapper and call it with the correct args', () => {
    const wrapper = jest.fn((fn) =>
      jest.fn((...args) => {
        const ret = fn(...args);

        return { ...ret, y: 2 };
      })
    );

    const wrapped = wrapWith(obj, ['a.fn'], wrapper);
    wrapped.a.fn(1);

    expect(obj.a.fn).toHaveBeenCalledWith(1);
  });

  it('should throw an error when path does not exist', () => {
    const wrapper = jest.fn((fn) =>
      jest.fn((...args) => {
        const ret = fn(...args);

        return { ...ret, y: 2 };
      })
    );

    expect(() =>
      wrapWith(obj, ['b.fn'] as unknown as ['a.fn'], wrapper)
    ).toThrow('Invalid path "b.fn", "b" is missing or has no value');
  });

  it('should throw an error when path is not a fn', () => {
    const wrapper = jest.fn((fn) =>
      jest.fn((...args) => {
        const ret = fn(...args);

        return { ...ret, y: 2 };
      })
    );

    expect(() =>
      wrapWith(obj, ['a.f1'] as unknown as ['a.fn'], wrapper)
    ).toThrow('"a.f1" is not a function');
  });
});
