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
  externalToken: {
    'is-true': (ctx) => !!ctx.token,
    'is-false': (ctx) => !ctx.token,
  },
  abTestingKey: {
    'greater-than': (ctx, predicate: number) =>
      (ctx.abTestingKey || 0) > predicate,
    'less-than': (ctx, predicate: number) =>
      (ctx.abTestingKey || 0) < predicate,
  },
};

export const calculateCondition = (
  condition: ClientCondition,
  ctx: Context,
) => {
  const checkFunc = conditionsMap[condition?.key]?.[condition.operator];
  if (!checkFunc) {
    return {};
  }
  const conditionResult = checkFunc(ctx, condition.predicate)
    ? condition.met
    : condition.unmet;
  return {
    startScreenId: conditionResult?.screenId,
    startStepId: conditionResult?.stepId,
    conditionInteractionId: conditionResult?.interactionId,
  };
};

/* eslint-disable import/prefer-default-export */
export const calculateConditions = (
  ctx: Context,
  conditions?: ClientCondition[],
) => {
  const conditionResult = conditions?.find(({ key, operator, predicate }) => {
    if (key === elseInteractionId) {
      return true;
    }
    const checkFunc = conditionsMap[key]?.[operator];
    return !!checkFunc?.(ctx, predicate);
  });
  return !conditionResult
    ? {}
    : {
        startScreenId: conditionResult.met.screenId,
        startStepId: conditionResult.met.stepId,
        conditionInteractionId: conditionResult.met.interactionId,
      };
};
