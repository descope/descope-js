import {
  ClientCondition,
  ClientConditionResult,
  ConditionsMap,
  Context,
} from '../types';

export const conditionsMap: ConditionsMap<Context> = {
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
  conditions: ClientCondition[],
  ctx: Context
) => {
  let conditionResult: ClientConditionResult;
  conditions.every((condition) => {
    const checkFunc = conditionsMap[condition?.key]?.[condition.operator];
    if (!checkFunc) {
      return {};
    }
    const check = checkFunc(ctx);
    if (check) {
      conditionResult = condition.met;
      // break
      return false;
    }
    conditionResult = condition.unmet;
    return true;
  });
  return {
    startScreenId: conditionResult?.screenId,
    conditionInteractionId: conditionResult?.interactionId,
  };
};
