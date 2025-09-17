import React, {
  lazy,
  Suspense,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import Context from '../hooks/Context';
import { RoleManagementProps } from '../types';
import withPropsMapping from './withPropsMapping';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const RoleManagementWC = lazy(async () => {
  await import('@descope/role-management-widget');

  return {
    default: withPropsMapping(
      React.forwardRef<HTMLElement>((props, ref) => (
	<descope-role-management-widget ref={ref} {...props} />
      )),
    ),
  };
});

const RoleManagement = React.forwardRef<HTMLElement, RoleManagementProps>(
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
		<RoleManagementWC
          ref={setInnerRef}
          projectId={projectId}
          widgetId={widgetId}
          tenant={tenant}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          baseCdnUrl={baseCdnUrl}
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

export default RoleManagement;
