import React, {
  lazy,
  Suspense,
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
  ({ logger, theme, debug, widgetId, onLogout, styleId }, ref) => {
    const [innerRef, setInnerRef] = useState(null);

    useImperativeHandle(ref, () => innerRef);

    const { projectId, baseUrl, baseStaticUrl, baseCdnUrl, refreshCookieName } =
      React.useContext(Context);

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
          baseCdnUrl={baseCdnUrl}
          styleId={styleId}
          ref={setInnerRef}
          {...{
            // attributes
            'theme.attr': theme,
            'debug.attr': debug,
            'styleId.attr': styleId,
            'refresh-cookie-name.attr': refreshCookieName,
            // props
            'logger.prop': logger,
          }}
        />
	</Suspense>
    );
  },
);

export default UserProfile;
