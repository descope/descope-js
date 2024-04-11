import { Audit, SearchAuditConfig } from '../types';

const search: (
  config: SearchAuditConfig,
  tenantId: string,
) => Promise<Audit[]> = async ({ text, sort }) =>
  new Promise((resolve) => {
    const audits: Audit[] = [];
    for (let i = 1; i < 9; i += 1) {
      audits.push({
        id: `Audit ${i}`,
        action: `Action ${i}`,
        actorId: `Actor ${i}`,
        type: `info`,
        method: `Method ${i}`,
        userId: `User ${i}`,
        device: `Device ${i}`,
        geo: `Geo ${i}`,
        remoteAddress: `127.0.0.${i}`,
        externalIds: [`Login ID ${i}`],
        occurred: new Date().getTime(),
      });
    }

    sort.forEach((s) => {
      audits.sort((a, b) =>
        !s.desc
          ? (a[s.field] as string)?.localeCompare(b[s.field] as string)
          : (b[s.field] as string)?.localeCompare(a[s.field] as string),
      );
    });
    resolve(
      audits.filter(
        (audit) =>
          audit.id.toLowerCase().includes(text.toLowerCase()) ||
          audit.action.toLowerCase().includes(text.toLowerCase()) ||
          audit.type.toLowerCase().includes(text.toLowerCase()) ||
          audit.device.toLowerCase().includes(text.toLowerCase()) ||
          audit.method.toLowerCase().includes(text.toLowerCase()) ||
          audit.geo.toLowerCase().includes(text.toLowerCase()) ||
          audit.remoteAddress.toLowerCase().includes(text.toLowerCase()) ||
          audit.externalIds.includes(text.toLowerCase()) ||
          audit.userId.toLowerCase().includes(text.toLowerCase()),
      ),
    );
  });

const audit = {
  search,
};
export { audit };
