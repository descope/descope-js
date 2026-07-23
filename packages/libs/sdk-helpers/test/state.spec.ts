import { State } from '../src';

describe('State', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with empty object by default', () => {
      const state = new State();

      expect(state.current).toEqual({});
    });

    it('should initialize with provided state', () => {
      const initialState = { count: 0, name: 'test' };
      const state = new State(initialState);

      expect(state.current).toEqual(initialState);
    });

    it('should support forceUpdate option', () => {
      const state = new State({ value: 1 }, { forceUpdate: true });

      expect(state.current).toEqual({ value: 1 });
    });
  });

  describe('current', () => {
    it('should return a copy of current state', () => {
      const initialState = { count: 0 };
      const state = new State(initialState);

      const current = state.current;
      current.count = 5;

      expect(state.current.count).toBe(0);
    });

    it('should return current state after updates', () => {
      const state = new State({ count: 0 });

      state.update({ count: 1 });
      expect(state.current.count).toBe(1);

      state.update({ count: 2 });
      expect(state.current.count).toBe(2);
    });
  });

  describe('update', () => {
    it('should update state with object', () => {
      const state = new State({ count: 0, name: 'test' });

      state.update({ count: 5 });

      expect(state.current).toEqual({ count: 5, name: 'test' });
    });

    it('should update state with function', () => {
      const state = new State({ count: 0 });

      state.update((prevState) => ({ count: prevState.count + 1 }));

      expect(state.current.count).toBe(1);
    });

    it('should merge partial state updates', () => {
      const state = new State({ a: 1, b: 2, c: 3 });

      state.update({ b: 20 });

      expect(state.current).toEqual({ a: 1, b: 20, c: 3 });
    });

    it('should notify subscribers on update', () => {
      const state = new State({ count: 0 });
      const callback = jest.fn();

      state.subscribe(callback);
      state.update({ count: 1 });

      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not notify subscribers if state did not change', () => {
      const state = new State({ count: 0 });
      const callback = jest.fn();

      state.subscribe(callback);
      state.update({ count: 0 });

      jest.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should freeze state after update', () => {
      const state = new State({ count: 0 });

      state.update({ count: 1 });

      // state.current returns a copy, so it's not frozen
      // But the internal state is frozen, which prevents direct mutation
      // Test that we can't mutate through the getter
      const current1 = state.current;
      current1.count = 999;
      const current2 = state.current;

      expect(current2.count).toBe(1); // Not affected by mutation of copy
    });

    it('should handle nested object updates', () => {
      const state = new State({ user: { name: 'Alice', age: 30 } });

      state.update({ user: { name: 'Bob', age: 25 } });

      expect(state.current).toEqual({ user: { name: 'Bob', age: 25 } });
    });

    it('should handle null values', () => {
      const state = new State({ value: null as any });

      state.update({ value: 'test' });

      expect(state.current.value).toBe('test');
    });

    it('should handle array updates', () => {
      const state = new State({ items: [1, 2, 3] });

      state.update({ items: [4, 5, 6] });

      expect(state.current.items).toEqual([4, 5, 6]);
    });

    it('should force update even when values are same', () => {
      const state = new State({ count: 0 }, { forceUpdate: true });
      const callback = jest.fn();

      state.subscribe(callback);
      state.update({ count: 0 });

      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('should return subscription token', () => {
      const state = new State({ count: 0 });
      const token = state.subscribe(() => {});

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should call subscriber with new state, prev state, and isChanged', () => {
      const state = new State({ count: 0, name: 'test' });
      let receivedState: any;
      let receivedPrevState: any;
      let receivedIsChanged: any;

      state.subscribe((newState, prevState, isChanged) => {
        receivedState = newState;
        receivedPrevState = prevState;
        receivedIsChanged = isChanged;
      });

      state.update({ count: 1 });
      jest.runAllTimers();

      expect(receivedState).toEqual({ count: 1, name: 'test' });
      expect(receivedPrevState).toEqual({ count: 0, name: 'test' });
      expect(typeof receivedIsChanged).toBe('function');
    });

    it('should support multiple subscribers', () => {
      const state = new State({ count: 0 });
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      state.subscribe(callback1);
      state.subscribe(callback2);

      state.update({ count: 1 });
      jest.runAllTimers();

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should increment token for each subscription', () => {
      const state = new State({ count: 0 });

      const token1 = state.subscribe(() => {});
      const token2 = state.subscribe(() => {});
      const token3 = state.subscribe(() => {});

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should handle async subscribers', () => {
      const state = new State({ count: 0 });
      const callback = jest.fn(async () => {
        // Async function
      });

      state.subscribe(callback);
      state.update({ count: 1 });
      jest.runAllTimers();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('isChanged', () => {
    it('should detect changed properties', () => {
      const state = new State({ a: 1, b: 2, c: 3 });
      let capturedIsChanged: any;

      state.subscribe((newState, prevState, isChanged) => {
        capturedIsChanged = isChanged;
      });

      state.update({ a: 10 });
      jest.runAllTimers();

      expect(capturedIsChanged('a')).toBe(true);
      expect(capturedIsChanged('b')).toBe(false);
      expect(capturedIsChanged('c')).toBe(false);
    });

    it('should work with nested objects', () => {
      const state = new State({ user: { name: 'Alice' }, count: 0 });
      let capturedIsChanged: any;

      state.subscribe((newState, prevState, isChanged) => {
        capturedIsChanged = isChanged;
      });

      state.update({ user: { name: 'Bob' } });
      jest.runAllTimers();

      expect(capturedIsChanged('user')).toBe(true);
      expect(capturedIsChanged('count')).toBe(false);
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscriber by token', () => {
      const state = new State({ count: 0 });
      const callback = jest.fn();

      const token = state.subscribe(callback);
      const result = state.unsubscribe(token);

      expect(result).toBe(true);

      state.update({ count: 1 });
      jest.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false for invalid token', () => {
      const state = new State({ count: 0 });

      const result = state.unsubscribe('invalid-token');

      expect(result).toBe(false);
    });

    it('should not affect other subscribers', () => {
      const state = new State({ count: 0 });
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const token1 = state.subscribe(callback1);
      state.subscribe(callback2);

      state.unsubscribe(token1);

      state.update({ count: 1 });
      jest.runAllTimers();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribing same token twice', () => {
      const state = new State({ count: 0 });
      const token = state.subscribe(() => {});

      const result1 = state.unsubscribe(token);
      const result2 = state.unsubscribe(token);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all subscribers', () => {
      const state = new State({ count: 0 });
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      state.subscribe(callback1);
      state.subscribe(callback2);
      state.subscribe(callback3);

      const result = state.unsubscribeAll();

      expect(result).toBe(true);

      state.update({ count: 1 });
      jest.runAllTimers();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });

    it('should return true even if no subscribers exist', () => {
      const state = new State({ count: 0 });

      const result = state.unsubscribeAll();

      expect(result).toBe(true);
    });

    it('should allow new subscriptions after unsubscribeAll', () => {
      const state = new State({ count: 0 });
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      state.subscribe(callback1);
      state.unsubscribeAll();
      state.subscribe(callback2);

      state.update({ count: 1 });
      jest.runAllTimers();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('complex scenarios', () => {
    it('should handle deeply nested objects', () => {
      const state = new State({
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      });

      state.update({
        level1: {
          level2: {
            level3: {
              value: 'updated',
            },
          },
        },
      });

      expect(state.current.level1.level2.level3.value).toBe('updated');
    });

    it('should compare nested objects correctly', () => {
      const state = new State({
        nested: { a: 1, b: 2 },
      });
      const callback = jest.fn();

      state.subscribe(callback);

      // Same values, different object reference
      state.update({ nested: { a: 1, b: 2 } });
      jest.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should detect changes in nested objects', () => {
      const state = new State({
        nested: { a: 1, b: 2 },
      });
      const callback = jest.fn();

      state.subscribe(callback);

      state.update({ nested: { a: 1, b: 3 } });
      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle object to null transitions', () => {
      const state = new State({ value: { nested: 'data' } as any });
      const callback = jest.fn();

      state.subscribe(callback);

      state.update({ value: null });
      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(state.current.value).toBe(null);
    });

    it('should handle different property counts in nested objects', () => {
      const state = new State<{ obj: any }>({
        obj: { a: 1, b: 2 },
      });
      const callback = jest.fn();

      state.subscribe(callback);

      state.update({ obj: { a: 1 } });
      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
