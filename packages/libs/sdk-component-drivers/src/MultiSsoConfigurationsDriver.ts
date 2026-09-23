import { BaseDriver } from './BaseDriver';

type Data = {
  id: string;
  name: string;
  authType?: string;
  isDefault?: boolean;
  link?: string;
  // A login through this connection verifies identity and creates no user.
  authenticationOnly?: boolean;
}[];

type DeleteDetail = { id: string; name: string };

type EditDetail = { id: string; authenticationOnly?: boolean };

// The edit half of this driver is the contract descope-multi-sso has to honor, and it is written
// here first because the component lives in another repo. Pinned so the two cannot drift:
//
//   - attribute `data-edit-flow-id` - the Descoper's edit flow; absent means render no edit control
//   - event `edit-clicked`, detail `{ id, authenticationOnly }` - id is the SSO configuration id
//   - `data[].authenticationOnly` - marks a row as verifying identity only
//
// Names, not shapes, are what break silently: a component emitting `editClicked` or sending
// `configId` would leave the widget looking wired and doing nothing.
export class MultiSsoConfigurationsDriver extends BaseDriver {
  nodeName = 'descope-multi-sso';

  set data(data: Data) {
    if (this.ele) this.ele.data = data;
  }

  get data() {
    return this.ele?.data;
  }

  get ele() {
    return super.ele as Element & {
      data: Data;
    };
  }

  get createFlowId() {
    return this.ele?.getAttribute('data-create-flow-id') || '';
  }

  get deleteFlowId() {
    return this.ele?.getAttribute('data-delete-flow-id') || '';
  }

  // Absent means the component offers no edit control, which is how a Descoper who does not want
  // one gets none: the same opt-in the create and delete flows already use.
  get editFlowId() {
    return this.ele?.getAttribute('data-edit-flow-id') || '';
  }

  onCreateClicked(cb: () => void) {
    const handler = () => cb();
    this.ele?.addEventListener('create-clicked', handler);

    return () => this.ele?.removeEventListener('create-clicked', handler);
  }

  onDeleteClicked(cb: (detail: DeleteDetail) => void) {
    const handler = (e: CustomEvent<DeleteDetail>) => cb(e.detail);
    this.ele?.addEventListener('delete-clicked', handler);

    return () => this.ele?.removeEventListener('delete-clicked', handler);
  }

  onEditClicked(cb: (detail: EditDetail) => void) {
    const handler = (e: CustomEvent<EditDetail>) => cb(e.detail);
    this.ele?.addEventListener('edit-clicked', handler);

    return () => this.ele?.removeEventListener('edit-clicked', handler);
  }
}
