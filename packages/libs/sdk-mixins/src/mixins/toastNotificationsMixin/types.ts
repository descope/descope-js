export type ToastNotification = {
  type: 'success' | 'error';
  msg: string;
  detail?: string;
};

export type NotificationContent = string | { msg: string; detail?: string };
