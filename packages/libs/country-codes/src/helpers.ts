import { CountryCodes } from './countryCodes';

export const getSortedCountryCodes = () =>
  CountryCodes.sort((a, b) => (a.name < b.name ? -1 : 1));
