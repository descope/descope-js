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
>(({ logger, tenant, theme, debug, widgetId, styleId }, ref) => {
  const [innerRef, setInnerRef] = useState(null);

  useImperativeHandle(ref, () => innerRef);

  const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

  return (
	<Suspense fallback={null}>
		<AccessKeyManagementWC
        projectId={projectId}
        widgetId={widgetId}
        baseUrl={baseUrl}
        baseStaticUrl={baseStaticUrl}
        innerRef={setInnerRef}
        {...{
          // attributes
          'tenant.attr': tenant,
          'theme.attr': theme,
          'debug.attr': debug,
          'styleId.attr': styleId,
          // props
          'logger.prop': logger,
        }}
      />
	</Suspense>
  );
});

export default AccessKeyManagement;
