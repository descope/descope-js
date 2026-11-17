// loggerMixin / initElementMixin pull in DOM setup a bare stub can't satisfy -
// reduce them to what componentsConditionsMixin uses
jest.mock('../src/mixins/loggerMixin', () => ({
  loggerMixin: (superclass: any) =>
    class extends superclass {
      logger = { debug: jest.fn() };
    },
}));
jest.mock('../src/mixins/initElementMixin', () => ({
  initElementMixin: (superclass: any) => superclass,
}));

// eslint-disable-next-line import/first
import { componentsConditionsMixin } from '../src/mixins/componentsConditionsMixin/componentsConditionsMixin';

const createEl = (attrs: Record<string, string>) => {
  const get = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ componentsState: {} }),
  });
  const MixinClass = componentsConditionsMixin(
    class {
      api = { httpClient: { get } };

      getAttribute(attr: string) {
        return attr in attrs ? attrs[attr] : null;
      }
    } as any,
  );
  return { el: new MixinClass() as any, get };
};

describe('componentsConditionsMixin', () => {
  it("sends the widget's tenant with the components-state request", async () => {
    const { el, get } = createEl({ tenant: 'acme' });
    await el.init();
    expect(get).toHaveBeenCalledWith('/v1/mgmt/widget/components-state', {
      queryParams: { tenant: 'acme' },
    });
  });

  it('sends no tenant for a project-level widget', async () => {
    const { el, get } = createEl({});
    await el.init();
    expect(get).toHaveBeenCalledWith(
      '/v1/mgmt/widget/components-state',
      undefined,
    );
  });
});
