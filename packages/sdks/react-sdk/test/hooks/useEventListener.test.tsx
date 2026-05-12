import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import useEventListener from '../../src/hooks/useEventListener';

describe('useEventListener', () => {
  it('adds and removes an event listener', () => {
    const el = document.createElement('div');
    const handler = jest.fn();

    const { unmount } = renderHook(() =>
      useEventListener(el, 'click', handler),
    );

    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when handler is undefined', () => {
    const el = document.createElement('div');
    expect(() =>
      renderHook(() => useEventListener(el, 'click', undefined)),
    ).not.toThrow();
  });

  it('does nothing when el is null', () => {
    const handler = jest.fn();
    expect(() =>
      renderHook(() => useEventListener(null, 'click', handler)),
    ).not.toThrow();
  });

  it('updates the listener when handler changes', () => {
    const el = document.createElement('div');
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const { rerender } = renderHook(
      ({ handler }: { handler: (e: Event) => void }) =>
        useEventListener(el, 'click', handler),
      { initialProps: { handler: handler1 } },
    );

    el.dispatchEvent(new Event('click'));
    expect(handler1).toHaveBeenCalledTimes(1);

    rerender({ handler: handler2 });
    el.dispatchEvent(new Event('click'));
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
