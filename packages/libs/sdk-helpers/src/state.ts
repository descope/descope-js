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

  #forceUpdate = true;

  constructor(init: T = {} as T, { forceUpdate = false } = {}) {
    this.#state = init;
    this.#forceUpdate = forceUpdate;
  }

  get current() {
    return { ...this.#state };
  }

  update = (newState: Partial<T> | UpdateStateCb<T>) => {
    const internalNewState =
      typeof newState === 'function' ? newState(this.#state) : newState;

    const nextState = { ...this.#state, ...internalNewState };
    if (this.#forceUpdate || !compareObjects(this.#state, nextState)) {
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

/**
 * Creates a state change handler that only reacts during an active operation.
 * This prevents the handler from incorrectly responding to unrelated state changes
 * that occur while the operation is in progress.
 */
export const createOperationStateHandler = <TState = any>({
  isActive,
  setActive,
  getOperationState,
  onSuccess,
  onError,
}: {
  /** Returns whether the operation is currently active */
  isActive: () => boolean;
  /** Sets the active state (for cleanup) */
  setActive: (active: boolean) => void;
  /** Extracts the relevant operation state (loading, error) from global state */
  getOperationState: (state: TState) => { loading: boolean; error?: any };
  /** Callback invoked when operation succeeds */
  onSuccess?: () => void;
  /** Callback invoked when operation fails (receives error) */
  onError?: (error: any) => void;
}) => {
  return (state: TState) => {
    // Only react if we're currently executing the operation
    if (!isActive()) {
      return;
    }

    const { loading, error } = getOperationState(state);

    // Wait until loading is complete
    if (loading) {
      return;
    }

    // Reset the active flag
    setActive(false);

    // Operation complete - invoke appropriate callback
    if (error) {
      onError?.(error);
    } else {
      onSuccess?.();
    }
  };
};
