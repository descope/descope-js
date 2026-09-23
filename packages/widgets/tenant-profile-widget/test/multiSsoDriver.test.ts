import { MultiSsoConfigurationsDriver } from '@descope/sdk-component-drivers';

// The edit half of this driver is a contract with descope-multi-sso, which lives in another repo.
// These assert the names, because a component that emitted `editClicked` or sent `configId` would
// leave the widget looking wired and doing nothing, with no error anywhere.
describe('MultiSsoConfigurationsDriver edit contract', () => {
  let ele: HTMLElement;
  let driver: MultiSsoConfigurationsDriver;

  beforeEach(() => {
    ele = document.createElement('descope-multi-sso');
    document.body.append(ele);
    driver = new MultiSsoConfigurationsDriver(() => ele, {
      logger: console,
    });
  });

  afterEach(() => ele.remove());

  it('reads the edit flow id from data-edit-flow-id', () => {
    expect(driver.editFlowId).toBe('');

    ele.setAttribute('data-edit-flow-id', 'edit-sso-config');
    expect(driver.editFlowId).toBe('edit-sso-config');
  });

  it('forwards edit-clicked with the configuration and its current state', () => {
    const onEdit = jest.fn();
    driver.onEditClicked(onEdit);

    ele.dispatchEvent(
      new CustomEvent('edit-clicked', {
        detail: { id: 'verify', authenticationOnly: true },
      }),
    );

    expect(onEdit).toHaveBeenCalledWith({
      id: 'verify',
      authenticationOnly: true,
    });
  });

  it('stops forwarding once unsubscribed', () => {
    const onEdit = jest.fn();
    const unsubscribe = driver.onEditClicked(onEdit);
    unsubscribe();

    ele.dispatchEvent(
      new CustomEvent('edit-clicked', { detail: { id: 'verify' } }),
    );

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('carries the classification on the rows it renders', () => {
    driver.data = [
      { id: '', name: 'Default', isDefault: true, authenticationOnly: false },
      { id: 'verify', name: 'Verification', authenticationOnly: true },
    ];

    expect(driver.data?.[1]).toMatchObject({
      id: 'verify',
      authenticationOnly: true,
    });
  });
});
