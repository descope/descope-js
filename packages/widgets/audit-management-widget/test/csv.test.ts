import { generateCsv } from '@descope/sdk-helpers';
import { AUDIT_CSV_COLUMNS } from '../src/lib/widget/helpers/csv';

describe('audit csv', () => {
  it('should have the expected audit columns', () => {
    expect(AUDIT_CSV_COLUMNS).toEqual([
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
    ]);
  });

  it('should generate correct CSV for audit data with AUDIT_CSV_COLUMNS', () => {
    const audits = [
      {
        occurredFormatted: '2026-01-01 00:00:00',
        userId: 'user1',
        actorId: 'actor1',
        externalIds: ['login1'],
        remoteAddress: '127.0.0.1',
        type: 'Info',
        action: 'LoginSucceed',
        device: 'Chrome',
        method: 'otp',
        geo: 'US',
      },
    ];
    const csv = generateCsv(audits, AUDIT_CSV_COLUMNS);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'Occurred,User ID,Actor,Login IDs,Remote Address,Type,Action,Device,Method,Geo',
    );
    expect(lines[1]).toBe(
      '2026-01-01 00:00:00,user1,actor1,login1,127.0.0.1,Info,LoginSucceed,Chrome,otp,US',
    );
  });

  it('should handle missing audit fields gracefully', () => {
    const audits = [{ occurredFormatted: 'time1', action: 'Login' }];
    const csv = generateCsv(audits, AUDIT_CSV_COLUMNS);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('time1');
    expect(lines[1]).toContain('Login');
    expect(lines[1].split(',').length).toBe(AUDIT_CSV_COLUMNS.length);
  });
});
