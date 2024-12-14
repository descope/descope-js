import React, { lazy, Suspense, useImperativeHandle, useState } from 'react';
import Context from '../hooks/Context';
import { AuditManagementProps } from '../types';
import WebComponentBridge from './WebComponentBridge';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const AuditManagementWC = lazy(async () => {
  await import('@descope/audit-management-widget');

  return {
    default: WebComponentBridge(
      React.forwardRef<HTMLElement>((props, ref) => (
	<descope-audit-management-widget ref={ref} {...props} />
      )),
    ),
  };
});

const AuditManagement = React.forwardRef<HTMLElement, AuditManagementProps>(
  ({ logger, tenant, theme, debug, widgetId, styleId }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

    return (
	<Suspense fallback={null}>
		<AuditManagementWC
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
            'style-id.attr': styleId,
            // props
            'logger.prop': logger,
          }}
        />
	</Suspense>
    );
  },
);

export default AuditManagement;
