import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import Context from '../hooks/Context';
import { UserProfileProps } from '../types';
import withPropsMapping from './withPropsMapping';

// web-component code uses browser API, but can be used in SSR apps, hence the lazy loading
const UserProfileWC = lazy(async () => {
  await import('@descope/user-profile-widget');

  return {
    default: withPropsMapping(
      React.forwardRef<HTMLElement>((props, ref) => (
	<descope-user-profile-widget ref={ref} {...props} />
      )),
    ),
  };
});

const UserProfile = React.forwardRef<HTMLElement, UserProfileProps>(
  (
    { logger, theme, debug, widgetId, onLogout, styleId, storagePrefix },
    ref,
  ) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const {
      projectId,
      baseUrl,
      baseStaticUrl,
      baseCdnUrl,
      refreshCookieName,
      setSession,
      setUser,
      setIsAuthenticated,
    } = React.useContext(Context);

    const handleLogout = useCallback(
      (e: CustomEvent) => {
        if (onLogout) {
          onLogout(e);
        }
        // we want to clear the session and user when the logout event is triggered
        setIsAuthenticated(false);
        setSession('');
        setUser(null);
      },
      [onLogout, setSession, setIsAuthenticated, setUser],
    );

    useEffect(() => {
      if (innerRef) {
        innerRef.addEventListener('logout', handleLogout);
        return () => innerRef.removeEventListener('logout', handleLogout);
      }
      return undefined;
    }, [innerRef, handleLogout]);

    return (
	<Suspense fallback={null}>
		<UserProfileWC
          projectId={projectId}
          widgetId={widgetId}
          baseUrl={baseUrl}
          baseStaticUrl={baseStaticUrl}
          baseCdnUrl={baseCdnUrl}
          styleId={styleId}
          ref={setInnerRef}
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
  },
);

export default UserProfile;
