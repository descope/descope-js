import { MODAL_ELE_TAG } from './constants';

export const createModalEle = (config = {}) => {
  const modal = document.createElement(MODAL_ELE_TAG);
  Object.keys(config).forEach((key) => {
    modal.setAttribute(key, config[key]);
  });

  return modal;
};
