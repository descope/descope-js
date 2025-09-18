import React, { lazy, Suspense, useImperativeHandle, useState } from 'react';
import Context from '../hooks/Context';
import { AccessKeyManagementProps } from '../types';
import withPropsMapping from './withPropsMapping';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const AccessKeyManagementWC = lazy(async () => {
  await import('@descope/access-key-management-widget');

  return {
    default: withPropsMapping(
      React.forwardRef<HTMLElement>((props, ref) => (
	<descope-access-key-management-widget ref={ref} {...props} />
      )),
    ),
  };
});

const AccessKeyManagement = React.forwardRef<
  HTMLElement,
  AccessKeyManagementProps
>(({ logger, tenant, theme, debug, widgetId, styleId, storagePrefix }, ref) => {
  const [innerRef, setInnerRef] = useState(null);

  useImperativeHandle(ref, () => innerRef);

  const { projectId, baseUrl, baseStaticUrl, baseCdnUrl, refreshCookieName } =
    React.useContext(Context);

  return (
	<Suspense fallback={null}>
		<AccessKeyManagementWC
        projectId={projectId}
        widgetId={widgetId}
        tenant={tenant}
        baseUrl={baseUrl}
        baseStaticUrl={baseStaticUrl}
        baseCdnUrl={baseCdnUrl}
        innerRef={setInnerRef}
        storagePrefix={storagePrefix}
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
});

export default AccessKeyManagement;
