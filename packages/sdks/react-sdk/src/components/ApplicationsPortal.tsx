import React, {
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import Context from '../hooks/Context';
import { ApplicationsPortalProps } from '../types';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const ApplicationsPortalWC = lazy(async () => {
  await import('@descope/applications-portal-widget');

  return {
    default: ({
      projectId,
      baseUrl,
      baseStaticUrl,
      innerRef,
      widgetId,
      theme,
      debug,
    }) => (
	<descope-applications-portal-widget
        project-id={projectId}
        widget-id={widgetId}
        base-url={baseUrl}
        base-static-url={baseStaticUrl}
        theme={theme}
        debug={debug}
        ref={innerRef}
      />
    ),
  };
});

const ApplicationsPortal = React.forwardRef<
  HTMLElement,
  ApplicationsPortalProps
>(({ logger, theme, debug, widgetId }, ref) => {
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
		<ApplicationsPortalWC
        projectId={projectId}
        widgetId={widgetId}
        baseUrl={baseUrl}
        baseStaticUrl={baseStaticUrl}
        innerRef={setInnerRef}
        theme={theme}
        debug={debug}
      />
	</Suspense>
  );
});

export default ApplicationsPortal;
