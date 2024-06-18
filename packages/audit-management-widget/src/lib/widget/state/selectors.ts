import { createSelector } from 'reselect';
import { State } from './types';

export const getRawAuditList = (state: State) => state.auditList.data;
export const getSelectedAuditId = (state: State) => state.selectedAuditId;
export const getSearchParams = (state: State) => state.searchParams;

export const getAuditList = createSelector(getRawAuditList, (audits) =>
  audits.map((audit) => ({
    ...audit,
    occurredFormatted: !audit?.occurred
      ? 'N/A'
      : new Date(Number(audit?.occurred) || 0).toLocaleString(),
  })),
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
