let sessionId: string;

export const getClientSessionId = (): string => {
  if (sessionId) {
    return sessionId;
  }
  const currentDate = new Date();
  const utcString = `${currentDate.getUTCFullYear().toString()}-${(
    currentDate.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, '0')}-${currentDate
    .getUTCDate()
    .toString()
    .padStart(2, '0')}-${currentDate
    .getUTCHours()
    .toString()
    .padStart(2, '0')}:${currentDate
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}:${currentDate
    .getUTCSeconds()
    .toString()
    .padStart(2, '0')}:${currentDate.getUTCMilliseconds().toString()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  sessionId = `${utcString}-${randomSuffix}`;
  return sessionId;
};
