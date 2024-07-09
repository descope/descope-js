import State from '../../src/lib/helpers/state';

jest.useFakeTimers();

describe('state', () => {
  it('should initialize state with the correct value', () => {
    const data = { a: 1 };
    const state = new State(data);

    expect(state.current).toEqual(data);
  });
  it('current should return the current state', () => {
    const data = { a: 1 };
    const state = new State({});
    state.update(data);

    jest.runAllTimers();

    expect(state.current).toEqual(data);
  });
  it('update should call all subscribers with current & previous state', () => {
    const init = {};
    const data = { a: 1 };

    const state = new State(init);
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    state.subscribe(subscriber1);
    state.subscribe(subscriber2);

    state.update(data);

    jest.runAllTimers();

    expect(subscriber1).toHaveBeenCalledWith(data, init, expect.any(Function));
    expect(subscriber2).toHaveBeenCalledWith(data, init, expect.any(Function));
  });

  it('update should call subscriber when nested object changes', () => {
    const init = { a: { b: 1 } };
    const data = { a: { b: 2 } };

    const state = new State(init);
    const subscriber1 = jest.fn();

    state.subscribe(subscriber1);
    state.update(data);

    jest.runAllTimers();

    expect(subscriber1).toHaveBeenCalledWith(data, init, expect.any(Function));
  });

  it('update not should call subscriber when nested object are equal', () => {
    const init = { a: { b: 1 } };
    const data = { a: { b: 1 } };

    const state = new State(init);
    const subscriber1 = jest.fn();

    state.subscribe(subscriber1);
    state.update(data);

    jest.runAllTimers();

    expect(subscriber1).not.toBeCalled();
  });

  it('update should call subscriber when objects are equal and updateOnlyOnChange is false', () => {
    const init = { a: { b: 1 } };
    const data = { a: { b: 1 } };

    const state = new State(init, { updateOnlyOnChange: false });
    const subscriber1 = jest.fn();

    state.subscribe(subscriber1);
    state.update(data);

    jest.runAllTimers();

    expect(subscriber1).toBeCalled();
  });

  it('update can get a function that is called with current state', () => {
    const data = { a: 1 };
    const state = new State(data);
    const updateFn = jest.fn();
    state.update(updateFn);

    jest.runAllTimers();

    expect(updateFn).toHaveBeenCalledWith(data);
  });

  it('update function return value should update state', () => {
    const data = { a: 1 };
    const state = new State(data);
    const newData = { a: 2 };

    const updateFn = () => newData;
    state.update(updateFn);

    jest.runAllTimers();

    expect(state.current).toEqual(newData);
  });

  it('isChanged returning true when value changed', () => {
    const data = { a: 1 };
    const state = new State(data);

    const subscriber1 = jest.fn();
    state.subscribe(subscriber1);

    const newData = { a: 2 };

    state.update(newData);

    jest.runAllTimers();

    const isChanged = subscriber1.mock.calls[0][2];

    expect(isChanged('a')).toBe(true);
  });

  it('isChanged returning false when value was not changed', () => {
    const data = { a: 1, b: 1 };
    const state = new State(data);

    const subscriber1 = jest.fn();
    state.subscribe(subscriber1);

    const newData = { a: 1, b: 2 };

    state.update(newData);

    jest.runAllTimers();

    const isChanged = subscriber1.mock.calls[0][2];

    expect(isChanged('a')).toBe(false);
  });

  it('subscribers are not called after unsubscribing', () => {
    const init = {};
    const data = { a: 1 };

    const state = new State(init);
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    const unsubscribe1 = state.subscribe(subscriber1);
    state.subscribe(subscriber2);

    state.unsubscribe(unsubscribe1);

    state.update(data);

    jest.runAllTimers();

    expect(subscriber1).not.toHaveBeenCalled();
    expect(subscriber2).toHaveBeenCalledWith(data, init, expect.any(Function));
  });
  it('subscribers are not called after unsubscribing all', () => {
    const init = {};
    const data = { a: 1 };

    const state = new State(init);
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    state.subscribe(subscriber1);
    state.subscribe(subscriber2);

    state.unsubscribeAll();
    state.update(data);

    jest.runAllTimers();

    expect(subscriber1).not.toHaveBeenCalled();
    expect(subscriber2).not.toHaveBeenCalled();
  });
});
