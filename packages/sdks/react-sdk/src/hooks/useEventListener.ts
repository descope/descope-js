import { useEffect } from 'react';

const useEventListener = <T extends Event>(
  el: HTMLElement | null,
  event: string,
  handler?: (e: T) => void,
) =>
  useEffect(() => {
    if (!handler || !el) return undefined;
    const listener = handler as EventListener;
    el.addEventListener(event, listener);
    return () => el.removeEventListener(event, listener);
  }, [el, event, handler]);

export default useEventListener;
