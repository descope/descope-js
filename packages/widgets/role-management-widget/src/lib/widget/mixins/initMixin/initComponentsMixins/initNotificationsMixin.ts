import { compose } from '@descope/sdk-helpers';
import { createToastNotificationsMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initNotificationsMixin = compose(
  stateManagementMixin,
  createToastNotificationsMixin(),
);
