const getFunctionHash = (fn: Function) => {
  const functionSource = fn.toString();

  let hash = 0;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < functionSource.length; i++) {
    const char = functionSource.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + char;
    // eslint-disable-next-line no-bitwise
    hash &= hash; // Convert to 32-bit integer
  }

  return hash.toString(16);
};

type Mixin = (superclass: CustomElementConstructor) => CustomElementConstructor;

export const createSingletonMixin = <T extends Mixin>(mixin: T): T => {
  const mixinNameSym = Symbol(getFunctionHash(mixin));

  const singletonMixin = (superclass: CustomElementConstructor) => {
    if (superclass[mixinNameSym]) {
      return superclass;
    }

    const cls = mixin(superclass);
    cls[mixinNameSym] = true;

    return cls;
  };

  return singletonMixin as T;
};
