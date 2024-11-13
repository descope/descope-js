import React, {
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import Context from '../hooks/Context';
import { UserProfileProps } from '../types';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const UserProfileWC = lazy(async () => {
  await import('@descope/user-profile-widget');

  return {
    default: ({
      projectId,
      baseUrl,
      baseStaticUrl,
      innerRef,
      widgetId,
      theme,
      debug,
      styleId,
    }) => (
	<descope-user-profile-widget
        project-id={projectId}
        widget-id={widgetId}
        base-url={baseUrl}
        base-static-url={baseStaticUrl}
        theme={theme}
        debug={debug}
        style-id={styleId}
        ref={innerRef}
      />
    ),
  };
});

const UserProfile = React.forwardRef<HTMLElement, UserProfileProps>(
  ({ logger, theme, debug, widgetId, onLogout, styleId }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl } = React.useContext(Context);

    useEffect(() => {
      if (innerRef && logger) {
        innerRef.logger = logger;
      }
    }, [innerRef, logger]);

    useEffect(() => {
      if (innerRef && onLogout) {
        innerRef.addEventListener('logout', onLogout);
        return () => innerRef.removeEventListener('logout', onLogout);
      }
      return undefined;
    }, [innerRef, onLogout]);

    return (
	<Suspense fallback={null}>
		<UserProfileWC
          projectId={projectId}
          widgetId={widgetId}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          innerRef={setInnerRef}
          theme={theme}
          styleId={styleId}
          debug={debug}
        />
	</Suspense>
    );
  },
);

export default UserProfile;
