// create publisher/subscriber instances
export function createPubSub<T extends any>() {
  const cbs = [];

  const sub = (cb: (data: T) => void) => {
    const idx = cbs.push(cb) - 1;
    return () => cbs.splice(idx, 1);
  };

  const pub = (data: T) => {
    cbs.forEach((cb) => cb(data));
  };

  return { pub, sub };
}
