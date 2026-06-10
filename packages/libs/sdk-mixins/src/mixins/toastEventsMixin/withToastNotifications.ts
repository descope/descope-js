type AnyAction = {
  error?: { message?: string; name?: string };
  payload?: unknown;
};

const normalize = (
  v: NotificationContent | undefined | null,
): { msg: string; detail?: string } =>
  typeof v === 'string' ? { msg: v } : v ?? { msg: '' };

export type NotificationContent = string | { msg: string; detail?: string };

export const withToastNotifications = <A extends AnyAction = AnyAction>({
  getErrorMsg,
  getSuccessMsg,
}: {
  // getErrorMsg receives the rejected action; typed as any to avoid inference collision
  // when the return value is used alongside buildAsyncReducer's FulfilledAction-typed handlers
  getErrorMsg?: (action: any) => NotificationContent | undefined;
  getSuccessMsg?: (action: A) => NotificationContent | undefined;
}) => ({
  onFulfilled: (state: any, action: A) => {
    if (!getSuccessMsg) return;
    const c = normalize(getSuccessMsg(action));
    if (c.msg) state.notifications.push({ type: 'success', ...c });
  },
  onRejected: (state: any, action: any) => {
    if (!getErrorMsg) return;
    const c = normalize(getErrorMsg(action));
    if (c.msg) state.notifications.push({ type: 'error', ...c });
  },
});
