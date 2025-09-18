import React, {
  lazy,
  Suspense,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import Context from '../hooks/Context';
import { UserManagementProps } from '../types';
import withPropsMapping from './withPropsMapping';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const UserManagementWC = lazy(async () => {
  await import('@descope/user-management-widget');

  return {
    default: withPropsMapping(
      React.forwardRef<HTMLElement>((props, ref) => (
	<descope-user-management-widget ref={ref} {...props} />
      )),
    ),
  };
});

const UserManagement = React.forwardRef<HTMLElement, UserManagementProps>(
  ({ logger, tenant, theme, debug, widgetId, styleId, onReady }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl, baseCdnUrl, refreshCookieName } =
      React.useContext(Context);

    useEffect(() => {
      const ele = innerRef;
      if (onReady) ele?.addEventListener('ready', onReady);

      return () => {
        if (onReady) ele?.removeEventListener('ready', onReady);
      };
    }, [innerRef, onReady]);

    return (
	<Suspense fallback={null}>
		<UserManagementWC
          projectId={projectId}
          widgetId={widgetId}
          tenant={tenant}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          baseCdnUrl={baseCdnUrl}
          ref={setInnerRef}
          {...{
            // attributes
            'theme.attr': theme,
            'debug.attr': debug,
            'styleId.attr': styleId,
            'refreshCookieName.attr': refreshCookieName,
            // props
            'logger.prop': logger,
          }}
        />
	</Suspense>
    );
  },
);

export default UserManagement;
