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
 *
 * @param isActive - Function that returns whether the operation is currently active
 * @param setActive - Function to set the active state (for cleanup)
 * @param getOperationState - Function that extracts the relevant operation state (loading, error)
 * @param onComplete - Callback invoked when operation completes (receives error if any)
 * @returns A state change handler function
 *
 * @example
 * ```typescript
 * const handler = createOperationStateHandler(
 *   () => this.#isLoading,
 *   (active) => { this.#isLoading = active; },
 *   (state) => state.myOperation,
 *   (error) => {
 *     if (error) {
 *       this.handleError(error);
 *     } else {
 *       this.handleSuccess();
 *     }
 *   }
 * );
 *
 * this.subscribe(handler);
 * ```
 */
export const createOperationStateHandler = (
  isActive: () => boolean,
  setActive: (active: boolean) => void,
  getOperationState: (state: any) => { loading: boolean; error?: any },
  onComplete: (error?: any) => void,
) => {
  return (state: any) => {
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

    // Operation complete - invoke callback
    onComplete(error);
  };
};
