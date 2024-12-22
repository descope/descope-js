import React, {
  useImperativeHandle,
  useMemo,
  ComponentType,
  useCallback,
  useRef,
} from 'react';
import { kebabCase } from '@descope/sdk-helpers';
import { transformAttrValue, transformKey } from './utils';

/**
 * withPropsMapping is a React HOC that adapts React props to work seamlessly
 * with web components by setting attributes and properties.
 *
 * - Props ending in `.prop` are set as properties on the web component.
 * - Props ending in `.attr` are transformed to kebab-case and set as attributes on the web component.
 * - All other props are set as kebab-case props
 *
 * This resolves attribute/property behavior differences in React 19.
 *
 * @see https://github.com/facebook/react/issues/29037
 */
const withPropsMapping = <P extends Record<string, any>>(
  Component: ComponentType<any>,
) =>
  React.forwardRef<HTMLElement, P>((props, ref) => {
    const { prop, attr, rest } = useMemo(
      () =>
        Object.entries(props).reduce(
          (acc, [key, value]) => {
            const { trimmedKey, category } = transformKey(key);
            if (category === 'prop') acc.prop.push([trimmedKey, value]);
            else if (category === 'attr')
              acc.attr.push([kebabCase(trimmedKey), transformAttrValue(value)]);
            else Object.assign(acc.rest, { [kebabCase(trimmedKey)]: value });
            return acc;
          },
          { attr: [], prop: [], rest: {} },
        ),
      [props],
    );

    const currRef = useRef<HTMLElement | null>(null);

    const setInnerRef = useCallback(
      (innerRef) => {
        currRef.current = innerRef;
        if (innerRef) {
          prop.forEach(([key, value]) => {
            currRef.current[key] = value;
          });

          attr.forEach(([key, value]) => {
            if (value === undefined || value === null) {
              innerRef.removeAttribute(key);
            } else {
              innerRef.setAttribute(key, value);
            }
          });
        }
      },
      [prop, attr, currRef],
    );

    useImperativeHandle(ref, () => currRef.current);

    return <Component ref={setInnerRef} {...rest} />;
  });

export default withPropsMapping;
