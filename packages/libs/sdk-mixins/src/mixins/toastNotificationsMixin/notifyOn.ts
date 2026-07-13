import type { AsyncThunk } from '@reduxjs/toolkit';
import type { NotificationContent, ToastNotification } from './types';

type Emitter = {
  notify: (toast: ToastNotification | ToastNotification[]) => void;
};

type SettledEffect = (result: any, element: Emitter) => void;

type ThunkWithSettledEffect = AsyncThunk<any, any, any> & {
  onSettled?: SettledEffect;
};

const normalize = (
  v: NotificationContent | undefined | null,
): { msg: string; detail?: string } =>
  typeof v === 'string' ? { msg: v } : v ?? { msg: '' };

/**
 * Attaches toast behavior to an async action.
 *
 * It sets an `onSettled` effect on the thunk. `createStateManagementMixin`
 * auto-registers a listener for every async action that has one, so when the
 * action settles the effect runs with the settled action and the element, and
 * this builds the message and shows the toast via `element.notify(...)`.
 *
 * Keeps the success/error copy right next to the action, and needs no extra
 * wiring in the widget.
 */
export const notifyOn = <T extends AsyncThunk<any, any, any>>(
  thunk: T,
  {
    getSuccessMsg,
    getErrorMsg,
  }: {
    getSuccessMsg?: (action: any) => NotificationContent | undefined;
    getErrorMsg?: (action: any) => NotificationContent | undefined;
  },
): T => {
  const effect: SettledEffect = (result, element) => {
    const isSuccess = result?.meta?.requestStatus === 'fulfilled';
    const raw = isSuccess ? getSuccessMsg?.(result) : getErrorMsg?.(result);
    const content = normalize(raw);

    if (!content.msg) return;

    element.notify({ ...content, type: isSuccess ? 'success' : 'error' });
  };

  (thunk as ThunkWithSettledEffect).onSettled = effect;

  return thunk;
};
