/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import { searchAudit } from '../state/asyncActions';
import { initialState } from '../state/initialState';
import { apiMixin } from './apiMixin';

export const stateManagementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createStateManagementMixin({
        name: 'widget',
        initialState,
        reducers: {
          setSelectedAuditId: (state, { payload }) => {
            state.selectedAuditId = payload;
          },
        },
        extraReducers: (builder) => {
          searchAudit.reducer(builder);
        },
        asyncActions: {
          searchAudit: searchAudit.action,
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

        this.subscribe((state: typeof initialState) => {
          this.logger.debug('State update:', state);
          this.state = state;
        });
      }
    };
  },
);
