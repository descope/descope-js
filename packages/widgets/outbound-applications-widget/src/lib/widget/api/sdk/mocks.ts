import { User, OutboundApplication } from '../types';

const getAllOutboundApps: () => Promise<{
  apps: OutboundApplication[];
}> = async () =>
  new Promise((resolve) => {
    resolve({
      apps: [
        {
          id: 'outboundApp1',
          name: 'Github',
          description: 'Connect with Github',
        },
        {
          id: 'outboundApp2',
          name: 'Facebook',
          description: 'Facebook Auth',
        },
        {
          id: 'outboundApp3',
          name: 'Custom',
          description: 'Custom authentication',
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
