import { AppsListDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getAppsList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

const limitAbbreviation = (str, limit = 2) =>
  str
    .trim()
    .split(' ')
    .splice(0, limit)
    .map((s) => s[0]?.toUpperCase())
    .join('');

const itemRenderer = ({ name, description, icon, url, size }) => `
  ${url ? `<a href="${url}" title="${url}" target="_blank">` : ''}
    <descope-list-item>
      <descope-avatar
        ${icon ? `img="${icon}"` : ''}
        ${name ? `display-name="${name}" abbr=${limitAbbreviation(name)}` : ''}
        size=${size}
      ></descope-avatar>
        <descope-text
          variant="body1"
          mode="primary"
        >${name}</descope-text>
        ${description ? `<descope-text
          variant="body2"
          mode="primary"
        >${description}</descope-text>` : ''}
    </descope-list-item>
  ${url ? `</a>` : ''}
`;

export const initAppsListMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAppsListMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      appsList: AppsListDriver;

      #initAppsList(appsList: ReturnType<typeof getAppsList>) {
        this.appsList = new AppsListDriver(
          () => this.shadowRoot?.querySelector('descope-apps-list'),
          { logger: this.logger },
        );
        this.appsList.data = appsList;
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initAppsList(getAppsList(this.state));
      }
    },
);
