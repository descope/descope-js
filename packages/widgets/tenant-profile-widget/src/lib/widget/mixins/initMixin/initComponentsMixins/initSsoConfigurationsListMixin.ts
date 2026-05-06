import { compose, createSingletonMixin, withMemCache } from '@descope/sdk-helpers';
import { cookieConfigMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { SsoConfiguration } from '../../../api/types';
import { getSsoConfigurations } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const initSsoConfigurationsListMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class SsoConfigurationsListMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      #idTouched = false;

      #getContainer() {
        return this.shadowRoot?.querySelector<HTMLElement>(
          '[data-id="tenant-sso-configurations"]',
        );
      }

      #getListEl() {
        return this.shadowRoot?.querySelector<HTMLElement>(
          '[data-id="tenant-sso-configurations-list"]',
        );
      }

      #renderRows = withMemCache((configs: SsoConfiguration[]) => {
        const listEl = this.#getListEl();
        if (!listEl) return;

        // Remove existing row children (keep non-row children like the create form)
        listEl.querySelectorAll('[data-sso-row]').forEach((el) => el.remove());

        configs.forEach((cfg) => {
          const row = document.createElement('div');
          row.setAttribute('data-sso-row', cfg.id);
          row.style.cssText =
            'display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;padding:14px 16px;border:1px solid var(--border-1);border-radius:var(--radius-md);margin-bottom:10px;';

          const body = document.createElement('div');

          const titleLine = document.createElement('div');
          titleLine.style.cssText = 'display:flex;align-items:center;gap:8px;';

          const link = document.createElement('a');
          link.setAttribute('data-sso-link-id', cfg.id);
          link.href = '#';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = cfg.name;
          link.style.cssText =
            'color:var(--fg-1);text-decoration:none;font-weight:600;';
          link.addEventListener('mouseover', () => {
            link.style.textDecoration = 'underline';
          });
          link.addEventListener('mouseout', () => {
            link.style.textDecoration = 'none';
          });
          titleLine.appendChild(link);

          const copyBtn = document.createElement('button');
          copyBtn.setAttribute('data-sso-copy-id', cfg.id);
          copyBtn.title = 'Copy connection URL';
          copyBtn.setAttribute('aria-label', 'Copy connection URL');
          copyBtn.style.cssText =
            'width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;padding:0;color:var(--fg-3);border-radius:var(--radius-xs);';
          copyBtn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
          titleLine.appendChild(copyBtn);

          if (cfg.isDefault) {
            const badge = document.createElement('span');
            badge.textContent = 'Default';
            badge.style.cssText =
              'display:inline-flex;align-items:center;padding:2px 10px;font-size:11px;font-weight:600;color:var(--fg-2);background:transparent;border:1px solid var(--border-1);border-radius:var(--radius-xs);';
            titleLine.appendChild(badge);
          }

          body.appendChild(titleLine);

          if (cfg.expires) {
            const meta = document.createElement('div');
            meta.style.cssText =
              'margin-top:4px;font-size:12px;color:var(--fg-2);font-weight:500;';
            meta.textContent = `Expires: ${cfg.expires}`;
            body.appendChild(meta);
          }

          row.appendChild(body);

          const actionsEl = document.createElement('div');
          actionsEl.style.cssText =
            'display:flex;align-items:center;justify-content:flex-end;min-width:40px;';

          if (!cfg.isDefault) {
            const deleteBtn = document.createElement('button');
            deleteBtn.setAttribute('data-sso-delete-id', cfg.id);
            deleteBtn.title = 'Delete';
            deleteBtn.setAttribute('aria-label', `Delete ${cfg.name}`);
            deleteBtn.style.cssText =
              'width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--fg-3);border-radius:var(--radius-xs);cursor:pointer;';
            deleteBtn.innerHTML =
              '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            actionsEl.appendChild(deleteBtn);
          }

          row.appendChild(actionsEl);
          listEl.appendChild(row);

          // Wire copy
          copyBtn.addEventListener('click', () => {
            navigator.clipboard?.writeText(link.href).catch(() => {});
          });

          // Wire delete
          if (!cfg.isDefault) {
            const deleteBtn = listEl.querySelector<HTMLButtonElement>(
              `[data-sso-delete-id="${cfg.id}"]`,
            );
            deleteBtn?.addEventListener('click', () => {
              this.actions.deleteSsoConfiguration({ id: cfg.id });
            });
          }
        });
      });

      #wireAddButton() {
        const addBtn = this.shadowRoot?.querySelector<HTMLElement>(
          '[data-id="tenant-sso-add-button"]',
        );
        const createForm = this.shadowRoot?.querySelector<HTMLElement>(
          '[data-id="tenant-sso-create-form"]',
        );
        if (!addBtn || !createForm) return;

        addBtn.addEventListener('click', () => {
          createForm.removeAttribute('hidden');
          addBtn.setAttribute('hidden', '');
          this.#idTouched = false;

          const nameField = createForm.querySelector<HTMLInputElement>(
            '[data-id="tenant-sso-create-name"]',
          );
          const idField = createForm.querySelector<HTMLInputElement>(
            '[data-id="tenant-sso-create-id"]',
          );
          if (nameField) {
            nameField.value = '';
            nameField.focus();
          }
          if (idField) idField.value = '';
        });

        const submitBtn = this.shadowRoot?.querySelector<HTMLElement>(
          '[data-id="tenant-sso-create-submit"]',
        );
        const cancelBtn = this.shadowRoot?.querySelector<HTMLElement>(
          '[data-id="tenant-sso-create-cancel"]',
        );

        const closeForm = () => {
          createForm.setAttribute('hidden', '');
          addBtn.removeAttribute('hidden');
        };

        cancelBtn?.addEventListener('click', closeForm);

        submitBtn?.addEventListener('click', () => {
          const nameField = createForm.querySelector<HTMLInputElement>(
            '[data-id="tenant-sso-create-name"]',
          );
          const idField = createForm.querySelector<HTMLInputElement>(
            '[data-id="tenant-sso-create-id"]',
          );
          const name = nameField?.value?.trim();
          if (!name) return;
          const id = idField?.value?.trim() || slugify(name);
          this.actions.createSsoConfiguration({ name, id });
          closeForm();
        });

        // Auto-generate ID from name on blur
        const nameField = this.shadowRoot?.querySelector<HTMLInputElement>(
          '[data-id="tenant-sso-create-name"]',
        );
        const idField = this.shadowRoot?.querySelector<HTMLInputElement>(
          '[data-id="tenant-sso-create-id"]',
        );
        idField?.addEventListener('input', () => {
          this.#idTouched = true;
        });
        nameField?.addEventListener('blur', () => {
          if (!this.#idTouched && nameField.value && idField) {
            idField.value = slugify(nameField.value);
          }
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        if (!this.multiSso) return;

        // Hide the legacy single-SSO row
        this.shadowRoot
          ?.querySelector<HTMLElement>('[data-id="tenant-admin-link-sso-row"]')
          ?.setAttribute('hidden', '');

        // Reveal the multi-SSO container (root.html ships it hidden)
        const container = this.#getContainer();
        if (!container) {
          this.logger.warn(
            'initSsoConfigurationsListMixin: [data-id="tenant-sso-configurations"] not found in root',
          );
          return;
        }
        container.removeAttribute('hidden');

        this.#wireAddButton();

        await this.actions.getSsoConfigurations();

        this.#renderRows(getSsoConfigurations(this.state));
        this.subscribe(
          (configs: SsoConfiguration[]) => this.#renderRows(configs),
          getSsoConfigurations,
        );
      }
    },
);
