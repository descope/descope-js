import { CountryCodes, getSortedCountryCodes } from '../src';

describe('country codes', () => {
  it('should place US country code first', () => {
    expect(CountryCodes[0].code).toEqual('US');
  });

  it('have a alphabetical sort', () => {
    expect(getSortedCountryCodes()).toEqual(
      CountryCodes.sort((a, b) => (a.name < b.name ? -1 : 1)),
    );
  });
});
