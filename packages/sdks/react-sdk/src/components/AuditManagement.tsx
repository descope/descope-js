import React, {
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import Context from '../hooks/Context';
import { AuditManagementProps } from '../types';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const AuditManagementWC = lazy(async () => {
  await import('@descope/audit-management-widget');

  return {
    default: ({
      projectId,
      baseUrl,
      baseStaticUrl,
      innerRef,
      tenant,
      widgetId,
      theme,
      debug,
      styleId,
    }) => (
	<descope-audit-management-widget
        project-id={projectId}
        widget-id={widgetId}
        base-url={baseUrl}
        base-static-url={baseStaticUrl}
        theme={theme}
        tenant={tenant}
        debug={debug}
        style-id={styleId}
        ref={innerRef}
      />
    ),
  };
});

const AuditManagement = React.forwardRef<HTMLElement, AuditManagementProps>(
  ({ logger, tenant, theme, debug, widgetId, styleId }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

    useEffect(() => {
      if (innerRef && logger) {
        innerRef.logger = logger;
      }
    }, [innerRef, logger]);

    return (
	<Suspense fallback={null}>
		<AuditManagementWC
          projectId={projectId}
          widgetId={widgetId}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          innerRef={setInnerRef}
          tenant={tenant}
          theme={theme}
          styleId={styleId}
          debug={debug}
        />
	</Suspense>
    );
  },
);

export default AuditManagement;
