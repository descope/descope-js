import { ClientCondition, ConditionsMap, Context } from '../types';

const elseInteractionId = 'ELSE';

const conditionsMap: ConditionsMap = {
  'lastAuth.loginId': {
    'not-empty': (ctx) => !!ctx.loginId,
    empty: (ctx) => !ctx.loginId,
  },
  idpInitiated: {
    'is-true': (ctx) => !!ctx.code,
    'is-false': (ctx) => !ctx.code,
  },
};

export const calculateCondition = (
  condition: ClientCondition,
  ctx: Context
) => {
  const checkFunc = conditionsMap[condition?.key]?.[condition.operator];
  if (!checkFunc) {
    return {};
  }
  const conditionResult = checkFunc(ctx) ? condition.met : condition.unmet;
  return {
    startScreenId: conditionResult?.screenId,
    conditionInteractionId: conditionResult?.interactionId,
  };
};

/* eslint-disable import/prefer-default-export */
export const calculateConditions = (
  ctx: Context,
  conditions?: ClientCondition[]
) => {
  const conditionResult = conditions?.find(({ key, operator }) => {
    if (key === elseInteractionId) {
      return true;
    }
    const checkFunc = conditionsMap[key]?.[operator];
    return !!checkFunc?.(ctx);
  });
  return !conditionResult
    ? {}
    : {
        startScreenId: conditionResult.met.screenId,
        conditionInteractionId: conditionResult.met.interactionId,
      };
};
