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
  [elseInteractionId]: {
    // always true
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
  const conditionResult = conditions?.find((condition) => {
    if (condition.key === elseInteractionId) {
      return true;
    }
    const checkFunc = conditionsMap[condition.key]?.[condition.operator];
    if (!checkFunc) {
      return false;
    }
    return checkFunc(ctx);
  });
  if (conditionResult) {
    return {
      startScreenId: conditionResult.met.screenId,
      conditionInteractionId: conditionResult.met.interactionId,
    };
  }
  return {};
};
