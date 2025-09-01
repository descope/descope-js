import { User, OutboundApplication } from '../types';

const getAllOutboundApps: () => Promise<{
  apps: OutboundApplication[];
}> = async () =>
  new Promise((resolve) => {
    resolve({
      apps: [
        {
          id: 'appId1',
          name: 'Application 1',
          description: 'Description',
        },
        {
          id: 'appId2',
          name: 'Application 2',
          description: 'Description',
        },
        {
          id: 'appId3',
          name: 'Application 3',
          description: 'Description',
        },
      ],
    });
  });

const getConnectedOutboundApps: () => Promise<{ apps: string[] }> = async () =>
  new Promise((resolve) => {
    resolve({
      apps: ['outboundApp3'],
    });
  });

const me: () => Promise<User> = async () =>
  new Promise((resolve) => {
    resolve({
      userId: `user-1`,
    });
  });

const outboundApps = {
  getAllOutboundApps,
  getConnectedOutboundApps,
};

const user = {
  me,
};

export { outboundApps, user };
