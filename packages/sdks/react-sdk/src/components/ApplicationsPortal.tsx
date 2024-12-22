import React, { lazy, Suspense, useImperativeHandle, useState } from 'react';
import Context from '../hooks/Context';
import { ApplicationsPortalProps } from '../types';
import withPropsMapping from './withPropsMapping';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const ApplicationsPortalWC = lazy(async () => {
  await import('@descope/applications-portal-widget');

  return {
    default: withPropsMapping(
      React.forwardRef<HTMLElement>((props, ref) => (
        <descope-applications-portal-widget ref={ref} {...props} />
      )),
    ),
  };
});

const ApplicationsPortal = React.forwardRef<
  HTMLElement,
  ApplicationsPortalProps
>(({ logger, theme, debug, widgetId, styleId }, ref) => {
  const [innerRef, setInnerRef] = useState(null);

  useImperativeHandle(ref, () => innerRef);

  const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

  return (
    <Suspense fallback={null}>
      <ApplicationsPortalWC
        projectId={projectId}
        widgetId={widgetId}
        baseUrl={baseUrl}
        baseStaticUrl={baseStaticUrl}
        innerRef={setInnerRef}
        {...{
          // attributes
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

export default ApplicationsPortal;
