export { generateCsv, downloadCsv } from '@descope/sdk-helpers';

export const AUDIT_CSV_COLUMNS = [
  { header: 'Occurred', path: 'occurredFormatted' },
  { header: 'User ID', path: 'userId' },
  { header: 'Actor', path: 'actorId' },
  { header: 'Login IDs', path: 'externalIds' },
  { header: 'Remote Address', path: 'remoteAddress' },
  { header: 'Type', path: 'type' },
  { header: 'Action', path: 'action' },
  { header: 'Device', path: 'device' },
  { header: 'Method', path: 'method' },
  { header: 'Geo', path: 'geo' },
];
