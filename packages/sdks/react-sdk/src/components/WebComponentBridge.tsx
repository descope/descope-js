import React, {
  useImperativeHandle,
  useMemo,
  ComponentType,
  useCallback,
  useRef,
} from 'react';
import { kebabCase } from '@descope/sdk-helpers';

const propSuffixes = {
  prop: '.prop',
  attr: '.attr',
};

/**
 * WebComponentBridge is a React HOC that adapts React props to work seamlessly
 * with web components by setting attributes and properties.
 *
 * - Props ending in `.prop` are set as properties on the web component.
 * - Props ending in `.attr` are set as attributes on the web component (kebab-case).
 * - All other props are set as props
 *
 * This resolves attribute/property behavior differences in React 19.
 *
 * @see https://github.com/facebook/react/issues/29037
 */
const WebComponentBridge = <P extends Record<string, any>>(
  Component: ComponentType<any>,
) =>
  React.forwardRef<HTMLElement, P>((props, ref) => {
    const compProps = useMemo(
      () =>
        Object.entries(props || {}).reduce((acc, [key, value]) => {
          if (
            key.endsWith(propSuffixes.attr) ||
            key.endsWith(propSuffixes.prop)
          ) {
            return acc;
          }
          return { ...acc, [kebabCase(key)]: value };
        }, {}),
      [props],
    );

    const currRef = useRef<HTMLElement | null>(null);

    const setInnerRef = useCallback(
      (innerRef) => {
        currRef.current = innerRef;
        if (innerRef) {
          Object.entries(props).forEach(([key, value]) => {
            if (key.endsWith(propSuffixes.prop)) {
              const readyKey = key.replace(/\.prop$/, '');
              currRef.current[readyKey] = value;
            } else if (key.endsWith(propSuffixes.attr)) {
              const kebabKey = kebabCase(key.replace(/\.attr$/, ''));
              if (value === undefined || value === null) {
                innerRef?.removeAttribute?.(kebabKey);
              } else {
                const readyValue =
                  typeof value === 'string' ? value : JSON.stringify(value);
                innerRef?.setAttribute?.(kebabKey, readyValue);
              }
            }
          });
        }
      },
      [props, currRef],
    );

    useImperativeHandle(ref, () => currRef.current);

    return <Component ref={setInnerRef} {...compProps} />;
  });

export default WebComponentBridge;
