import { createSelector } from 'reselect';
import { State } from './types';
import { capitalize, conditionalJsonParse, conditionalObj } from './helpers';

export const getRawAuditList = (state: State) => state.auditList.data;
export const getSelectedAuditId = (state: State) => state.selectedAuditId;
export const getSearchParams = (state: State) => state.searchParams;

const filterEmptyFields = (audit: Record<string, any>) =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Object.fromEntries(Object.entries(audit).filter(([_, v]) => !!v));

export const getAuditList = createSelector(getRawAuditList, (audits) =>
  audits.map((audit) => {
    const {
      occurred,
      ID,
      type,
      data: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        saml_request,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        saml_response,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        saml_generated_user,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        saml_generated_roles,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        oidc_response,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        oidc_generated_user,
        ...data
      } = {
        saml_request: '',
        saml_response: '',
        saml_generated_user: '',
        saml_generated_roles: '',
        oidc_response: '',
        oidc_generated_user: '',
      },
      ...auditRest
    } = audit || {};

    const ret = {
      ...auditRest,
      data,
      ...conditionalObj('type', capitalize(type)),
      ...conditionalObj('saml_request', saml_request),
      ...conditionalObj('saml_response', saml_response),
      ...conditionalObj(
        'saml_generated_user',
        conditionalJsonParse(saml_generated_user),
      ),
      ...conditionalObj(
        'saml_generated_roles',
        conditionalJsonParse(saml_generated_roles),
      ),
      ...conditionalObj('oidc_response', conditionalJsonParse(oidc_response)),
      ...conditionalObj(
        'oidc_generated_user',
        conditionalJsonParse(oidc_generated_user),
      ),
      occurredFormatted: !occurred
        ? 'N/A'
        : new Date(Number(occurred) || 0).toLocaleString(),
    };

    return filterEmptyFields(ret);
  }),
);

export const getSelectedAudit = createSelector(
  getSelectedAuditId,
  getAuditList,
  (selected, audits) => audits.find((audit) => selected === audit.id),
);

export const getIsAuditSelected = createSelector(
  getSelectedAuditId,
  (selected) => !!selected,
);
