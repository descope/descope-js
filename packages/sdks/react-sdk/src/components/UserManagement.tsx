import React, { lazy, Suspense, useImperativeHandle, useState } from 'react';
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
  ({ logger, tenant, theme, debug, widgetId, styleId }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

    return (
      <Suspense fallback={null}>
        <UserManagementWC
          projectId={projectId}
          widgetId={widgetId}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          ref={setInnerRef}
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
  },
);

export default UserManagement;
