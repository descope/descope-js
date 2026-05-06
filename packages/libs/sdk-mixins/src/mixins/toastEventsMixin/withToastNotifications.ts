const toContent = (v: string | { msg: string; detail?: string }) =>
  typeof v === 'string' ? { msg: v } : v;

export type NotificationContent = string | { msg: string; detail?: string };

export const withToastNotifications = ({
  getErrorMsg,
  getSuccessMsg,
}: {
  getErrorMsg?: (action?: any) => NotificationContent;
  getSuccessMsg?: (action?: any) => NotificationContent;
}) => ({
  onFulfilled: (state: any, action: any) => {
    if (getSuccessMsg)
      state.notifications.push({
        type: 'success',
        ...toContent(getSuccessMsg(action)),
      });
  },
  onRejected: (state: any, action: any) => {
    if (getErrorMsg)
      state.notifications.push({
        type: 'error',
        ...toContent(getErrorMsg(action)),
      });
  },
});
