const createIsChanged =
  <T extends Record<string, any>>(state: T, prevState: T) =>
  (attrName: keyof T) =>
    state[attrName] !== prevState[attrName];

type StateObject = Record<string, any>;

type UpdateStateCb<T> = (state: T) => Partial<T>;
type Subscribers<T> = Record<string, SubscribeCb<T>>;

// eslint-disable-next-line import/exports-last
export type SubscribeCb<T> = (
  state: T,
  prevState: T,
  isChanged: ReturnType<typeof createIsChanged>,
) => void | Promise<void>;

function compareObjects(
  objectA: Record<string, any>,
  objectB: Record<string, any>,
) {
  const aProperties = Object.getOwnPropertyNames(objectA);
  const bProperties = Object.getOwnPropertyNames(objectB);

  if (aProperties.length !== bProperties.length) {
    return false;
  }

  for (let i = 0; i < aProperties.length; i += 1) {
    const propName = aProperties[i];

    const valA = objectA[propName];
    const valB = objectB[propName];
    if (valA === null || valB === null) {
      if (valA !== valB) {
        return false;
      }
    } else if (typeof valA === 'object' && typeof valB === 'object') {
      // compare nested objects
      if (!compareObjects(valA, valB)) {
        return false;
      }
    } else if (valA !== valB) {
      return false;
    }
  }

  return true;
}

export type IsChanged<T> = Parameters<SubscribeCb<T>>[2];

export class State<T extends StateObject> {
  #state: T;

  #subscribers: Subscribers<T> = {};

  #token = 0;

  #updateOnlyOnChange = false;

  constructor(init: T = {} as T, { updateOnlyOnChange = true } = {}) {
    this.#state = init;
    this.#updateOnlyOnChange = updateOnlyOnChange;
  }

  get current() {
    return { ...this.#state };
  }

  update = (newState: Partial<T> | UpdateStateCb<T>) => {
    const internalNewState =
      typeof newState === 'function' ? newState(this.#state) : newState;

    const nextState = { ...this.#state, ...internalNewState };
    if (!this.#updateOnlyOnChange || !compareObjects(this.#state, nextState)) {
      const prevState = this.#state;
      this.#state = nextState;
      Object.freeze(this.#state);

      setTimeout(() => {
        Object.values(this.#subscribers).forEach((cb) =>
          cb(nextState, prevState, createIsChanged(nextState, prevState)),
        );
      }, 0);
    }
  };

  subscribe(cb: SubscribeCb<T>) {
    this.#token += 1;
    this.#subscribers[this.#token] = cb;

    return this.#token.toString();
  }

  unsubscribe(token: string) {
    const isFound = !!this.#subscribers[token];

    if (isFound) {
      delete this.#subscribers[token];
    }

    return isFound;
  }

  unsubscribeAll() {
    this.#subscribers = {};

    return true;
  }
}
