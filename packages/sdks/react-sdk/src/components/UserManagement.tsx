import React, {
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import Context from '../hooks/Context';
import { UserManagementProps } from '../types';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const UserManagementWC = lazy(async () => {
  await import('@descope/user-management-widget');

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
	<descope-user-management-widget
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

const UserManagement = React.forwardRef<HTMLElement, UserManagementProps>(
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
		<UserManagementWC
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

export default UserManagement;
