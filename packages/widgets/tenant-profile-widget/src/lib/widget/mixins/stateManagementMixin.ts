/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import {
  createSsoConfiguration,
  deleteSsoConfiguration,
  getMe,
  getSsoConfigurations,
  getTenant,
  getTenantAdminLinkSSO,
} from '../state/asyncActions';
import { initialState } from '../state/initialState';
import { apiMixin } from './apiMixin';

export const stateManagementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createStateManagementMixin({
        name: 'widget',
        initialState,
        reducers: {},
        extraReducers: (builder) => {
          getMe.reducer(builder);
          getTenant.reducer(builder);
          getTenantAdminLinkSSO.reducer(builder);
          getSsoConfigurations.reducer(builder);
          createSsoConfiguration.reducer(builder);
          deleteSsoConfiguration.reducer(builder);
        },
        asyncActions: {
          getMe: getMe.action,
          getTenant: getTenant.action,
          getTenantAdminLinkSSO: getTenantAdminLinkSSO.action,
          getSsoConfigurations: getSsoConfigurations.action,
          createSsoConfiguration: createSsoConfiguration.action,
          deleteSsoConfiguration: deleteSsoConfiguration.action,
        },
      }),
      initLifecycleMixin,
      loggerMixin,
      apiMixin,
    )(superclass);
    return class StateManagementMixinClass extends BaseClass {
      state = initialState;

      constructor(...args: any) {
        super(...args);

        this.subscribe((state) => {
          this.logger.debug('State update:', state);
          this.state = state;
        });
      }
    };
  },
);
