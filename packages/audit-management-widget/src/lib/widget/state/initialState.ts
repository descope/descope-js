import { State } from './types';

export const initialState: State = {
  auditList: {
    data: [],
    loading: false,
    error: null,
  },
  searchParams: { text: '', sort: [] },
  selectedAuditId: '',
};
