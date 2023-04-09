import { ClientCondition, ConditionsMap, Context } from '../types';

export const conditions: ConditionsMap<Context> = {
  'lastAuth.loginId': {
    'not-empty': (ctx) => !!ctx.loginId,
    empty: (ctx) => !ctx.loginId,
  },
  idpInitiated: {
    'is-true': (ctx) => !!ctx.code,
    'is-false': (ctx) => !ctx.code,
  },
};

/* eslint-disable import/prefer-default-export */
export const calculateCondition = (
  condition: ClientCondition,
  ctx: Context
) => {
  const checkFunc = conditions[condition?.key]?.[condition.operator];
  if (!checkFunc) {
    return {};
  }
  const conditionResult = checkFunc(ctx) ? condition.met : condition.unmet;
  return {
    startScreenId: conditionResult?.screenId,
    conditionInteractionId: conditionResult?.interactionId,
  };
};
