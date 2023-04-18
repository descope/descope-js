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
export const calculateConditions = (
  ctx: Context,
  conditions?: ClientCondition[]
) => {
  let conditionResult: ClientConditionResult;
  conditions?.every((condition) => {
    const checkFunc = conditionsMap[condition?.key]?.[condition.operator];
    if (!checkFunc) {
      conditionResult = undefined;
      // break
      return false;
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
  if (conditionResult) {
    return {
      startScreenId: conditionResult?.screenId,
      conditionInteractionId: conditionResult?.interactionId,
    };
  }
  return {};
};
