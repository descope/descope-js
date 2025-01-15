import React, { lazy, Suspense, useImperativeHandle, useState } from 'react';
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
  ({ logger, tenant, theme, debug, widgetId, styleId }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

    return (
	<Suspense fallback={null}>
		<RoleManagementWC
          projectId={projectId}
          widgetId={widgetId}
          tenant={tenant}
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
  },
);

export default RoleManagement;
