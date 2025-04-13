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
    'greater-than-or-equal': (ctx, predicate: number) =>
      (ctx.abTestingKey || 0) >= predicate,
    'less-than-or-equal': (ctx, predicate: number) =>
      (ctx.abTestingKey || 0) <= predicate,
    'in-range': (ctx, predicate: string) => {
      const [min, max] = predicate?.split(',').map(Number);
      return (ctx.abTestingKey || 0) >= min && (ctx.abTestingKey || 0) <= max;
    },
    'not-in-range': (ctx, predicate: string) => {
      const [min, max] = predicate?.split(',').map(Number);
      if (!min || !max || isNaN(min) || isNaN(max)) {
        // if no range is provided, return true, this is consistent with Descope server behavior
        return true;
      }
      return (ctx.abTestingKey || 0) < min || (ctx.abTestingKey || 0) > max;
    },
    'devised-by': (ctx, predicate: string) => {
      const predicateNum = Number(predicate);
      if (isNaN(predicateNum)) {
        return false;
      }
      return (ctx.abTestingKey || 0) % predicateNum === 0;
    },
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
    startScreenName: conditionResult?.screenName,
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
        startScreenName: conditionResult.met.screenName,
        conditionInteractionId: conditionResult.met.interactionId,
        clientScripts: conditionResult.met.clientScripts,
        componentsConfig: conditionResult.met.componentsConfig,
      };
};
