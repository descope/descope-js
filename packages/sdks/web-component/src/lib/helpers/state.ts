import { createIsChanged } from './helpers';

type StateObject = Record<string, any>;

// eslint-disable-next-line import/exports-last
export type SubscribeCb<T> = (
  state: T,
  prevState: T,
  isChanged: ReturnType<typeof createIsChanged>,
) => void | Promise<void>;

type UpdateStateCb<T> = (state: T) => Partial<T>;

type Subscribers<T> = Record<
  string,
  { cb: SubscribeCb<ReturnType<SelectorCb<T>>>; selector: SelectorCb<T> }
>;

export type SelectorCb<T> = (state: T) => any;

export type IsChanged<T> = Parameters<SubscribeCb<T>>[2];

function isPlainObject(maybeObj: any) {
  if (typeof maybeObj !== 'object' || maybeObj === null) return false;
  const proto = Object.getPrototypeOf(maybeObj);
  return proto === Object.prototype || proto === null;
}

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

class State<T extends StateObject> {
  #state: T;

  #subscribers: Subscribers<T> = {};

  #token = 0;

  #forceUpdateAll = true;

  constructor(init: T = {} as T, { forceUpdate = false } = {}) {
    this.#state = init;
    this.#forceUpdateAll = forceUpdate;
  }

  get current() {
    return { ...this.#state };
  }

  set forceUpdate(forceUpdate: boolean) {
    this.#forceUpdateAll = forceUpdate;
  }

  update = (newState: Partial<T> | UpdateStateCb<T>) => {
    const internalNewState =
      typeof newState === 'function' ? newState(this.#state) : newState;

    const nextState = { ...this.#state, ...internalNewState };
    const prevState = this.#state;
    this.#state = nextState;
    Object.freeze(this.#state);

    setTimeout(() => {
      Object.values(this.#subscribers).forEach(({ cb, selector }) => {
        const partialPrevState = selector(prevState);
        const partialNextState = selector(nextState);

        if (
          this.#forceUpdateAll ||
          (isPlainObject(partialNextState)
            ? !compareObjects(partialPrevState, partialNextState)
            : partialPrevState !== partialNextState)
        ) {
          cb(
            partialNextState,
            partialPrevState,
            createIsChanged(partialNextState, partialPrevState),
          );
        }
      });
    }, 0);
  };

  subscribe<R extends any | Partial<T>>(
    cb: SubscribeCb<R>,
    selector: (state: T) => R = (state: T) => state as unknown as R,
  ) {
    this.#token += 1;
    this.#subscribers[this.#token] = { cb, selector };

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

export default State;
