import { getStorageItem, setStorageItem } from './storage';

const LOCAL_STORAGE_AB_TESTING_KEY = 'dls_ab_testing_id';

// eslint-disable-next-line import/prefer-default-export
export const getABTestingKey = (): number => {
  const abTestingKey = getStorageItem(LOCAL_STORAGE_AB_TESTING_KEY);
  if (!abTestingKey) {
    const generatedKey = Math.floor(Math.random() * 100 + 1);
    setStorageItem(LOCAL_STORAGE_AB_TESTING_KEY, generatedKey.toString());
    return generatedKey;
  }
  return Number(abTestingKey);
};
