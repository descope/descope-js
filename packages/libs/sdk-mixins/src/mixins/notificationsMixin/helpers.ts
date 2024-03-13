import { NOTIFICATION_ELE_TAG } from './constants';

export const createNotificationEle = (config = {}) => {
  const notification = document.createElement(NOTIFICATION_ELE_TAG);
  Object.keys(config).forEach((key) => {
    notification.setAttribute(key, config[key]);
  });

  return notification;
};
