import { BaseDriver } from './BaseDriver';

type Mapping = { tenantId: string; roleNames: string[] };

export class MultiLineMappingsDriver extends BaseDriver {
  nodeName = 'descope-multi-line-mappings';

  setData(data: Record<string, string[]>) {
    this.ele?.setAttribute('data', JSON.stringify(data));
  }

  get value(): Mapping[] {
    return (this.ele as any)?.value || [];
  }

  set value(mappings: Mapping[]) {
    if (this.ele) {
      (this.ele as any).value = mappings;
    }
  }

  get mergedValue(): Mapping[] {
    return Object.entries(
      this.value.reduce<Record<string, string[]>>(
        (acc, { tenantId, roleNames }) => {
          acc[tenantId] = [
            ...new Set([...(acc[tenantId] || []), ...roleNames]),
          ];
          return acc;
        },
        {},
      ),
    ).map(([tenantId, roleNames]) => ({ tenantId, roleNames }));
  }
}
