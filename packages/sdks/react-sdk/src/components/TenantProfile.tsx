import React, { lazy, Suspense, useImperativeHandle, useState } from 'react';
import Context from '../hooks/Context';
import { TenantProfileProps } from '../types';
import withPropsMapping from './withPropsMapping';

const TenantProfileWC = lazy(async () => {
  await import('@descope/tenant-profile-widget');

  return {
    default: withPropsMapping(
      React.forwardRef<HTMLElement>((props, ref) => (
	<descope-tenant-profile-widget ref={ref} {...props} />
      )),
    ),
  };
});

const TenantProfile = React.forwardRef<HTMLElement, TenantProfileProps>(
  ({ logger, theme, debug, widgetId, styleId, tenant }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl, baseCdnUrl, refreshCookieName } =
      React.useContext(Context);

    return (
	<Suspense fallback={null}>
		<TenantProfileWC
          projectId={projectId}
          widgetId={widgetId}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          baseCdnUrl={baseCdnUrl}
          styleId={styleId}
          tenant={tenant}
          ref={setInnerRef}
          {...{
            'theme.attr': theme,
            'debug.attr': debug,
            'styleId.attr': styleId,
            'tenant.attr': tenant,
            'refreshCookieName.attr': refreshCookieName,
            'logger.prop': logger,
          }}
        />
	</Suspense>
    );
  },
);

export default TenantProfile;
