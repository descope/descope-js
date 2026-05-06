import { compose } from '@descope/sdk-helpers';
import { createToastEventsMixin } from '@descope/sdk-mixins';
import checkmark from '../../../../assets/checkmark.svg';
import close from '../../../../assets/close.svg';
import warning from '../../../../assets/warning.svg';
import { getNotifications } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initNotificationsMixin = compose(
  stateManagementMixin,
  createToastEventsMixin({
    selector: getNotifications,
    icons: { success: checkmark, error: warning, close },
  }),
);
