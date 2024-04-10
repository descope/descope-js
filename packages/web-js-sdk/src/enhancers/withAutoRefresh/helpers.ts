export const millisecondsUntilDate = (date: Date) =>
  date ? date.getTime() - new Date().getTime() : 0;

export const createTimerFunctions = () => {
  const timerIds: NodeJS.Timeout[] = [];

  const clearAllTimers = () => {
    while (timerIds.length) {
      clearTimeout(timerIds.pop());
    }
  };

  const setTimer = (cb: () => void, timeout: number) => {
    timerIds.push(setTimeout(cb, timeout));
  };

  return { clearAllTimers, setTimer };
};
