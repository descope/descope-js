export const userStatusMappings = {
  enabled: 'active',
  disabled: 'disabled',
  invited: 'invited',
};

export const MULTIPLE_ROLES_LABEL = 'Multiple roles';

// Same texts as the console users page (user.lockReason.* and user.lock.* in console-app)
export const lockReasonLabels: Record<string, string> = {
  password: 'Passwords',
  totp: 'TOTP',
  recovery_codes: 'Recovery Codes',
  security_questions: 'Security Questions',
};
export const LOCKED_LABEL = 'Locked';
export const TEMP_LOCKED_LABEL = 'Temp. Locked';
