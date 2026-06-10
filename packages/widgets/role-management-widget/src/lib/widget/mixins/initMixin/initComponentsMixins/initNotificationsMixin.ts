import { compose } from '@descope/sdk-helpers';
import { createToastEventsMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initNotificationsMixin = compose(
  stateManagementMixin,
  createToastEventsMixin(),
);
