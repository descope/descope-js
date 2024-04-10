export const mockAudit = {
  audit: [
    {
      id: `Audit 1`,
      action: `Action 1`,
      actorId: `Actor 1`,
      type: `info`,
      method: `Method 1`,
      userId: `User 1`,
      device: `Device 1`,
      geo: `Geo 1`,
      remoteAddress: `127.0.0.1`,
      externalIds: [`Login ID 1`],
      occurred: new Date().getTime(),
    },
    {
      id: `Audit 2`,
      action: `Action 2`,
      actorId: `Actor 2`,
      type: `info`,
      method: `Method 2`,
      userId: `User 2`,
      device: `Device 2`,
      geo: `Geo 2`,
      remoteAddress: `127.0.0.2`,
      externalIds: [`Login ID 2`],
      occurred: new Date().getTime(),
    },
    {
      id: `Audit 3`,
      action: `Action 3`,
      actorId: `Actor 3`,
      type: `info`,
      method: `Method 3`,
      userId: `User 3`,
      device: `Device 3`,
      geo: `Geo 3`,
      remoteAddress: `127.0.0.3`,
      externalIds: [`Login ID 3`],
      occurred: new Date().getTime(),
    },
  ],
};
