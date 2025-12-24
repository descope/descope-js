import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleManagementComponent } from './role-management.component';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import { CUSTOM_ELEMENTS_SCHEMA, PLATFORM_ID } from '@angular/core';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
//Mock DescopeRoleManagementWidget
jest.mock('@descope/role-management-widget', () => {
  return jest.fn(() => {
    // Create a mock DOM element
    return document.createElement('descope-role-management-widget');
  });
});

describe('DescopeRoleManagementComponent', () => {
  let component: RoleManagementComponent;
  let fixture: ComponentFixture<RoleManagementComponent>;
  let mockedCreateSdk: jest.Mock;
  const onRoleChangeSpy = jest.fn();
  const afterRequestHooksSpy = jest.fn();
  const mockConfig: DescopeAuthConfig = {
    projectId: 'someProject'
  };

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);

    mockedCreateSdk.mockReturnValue({
      onRoleChange: onRoleChangeSpy,
      httpClient: {
        hooks: {
          afterRequest: afterRequestHooksSpy
        }
      }
    });

    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        DescopeAuthConfig,
        { provide: DescopeAuthConfig, useValue: mockConfig }
      ]
    });

    fixture = TestBed.createComponent(RoleManagementComponent);
    component = fixture.componentInstance;
    component.projectId = '123';
    component.tenant = 'tenant-1';
    component.widgetId = 'widget-1';
    component.styleId = 'style-1';
    component.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-role-management-widget'
    );
    expect(webComponentHtml).toBeDefined();
  });

  it('should correctly setup attributes based on inputs', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-role-management-widget'
    )!;
    expect(webComponentHtml.getAttribute('project-id')).toStrictEqual('123');
    expect(webComponentHtml.getAttribute('tenant')).toStrictEqual('tenant-1');
    expect(webComponentHtml.getAttribute('widget-id')).toStrictEqual(
      'widget-1'
    );
    expect(webComponentHtml.getAttribute('logger')).toBeDefined();
    expect(webComponentHtml.getAttribute('style-id')).toStrictEqual('style-1');
  });

  it('should emit ready event when web component dispatches ready', async () => {
    const readySpy = jest.fn();
    component.ready.subscribe(readySpy);

    // Wait for async widget loading to complete
    await fixture.whenStable();
    fixture.detectChanges();

    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-role-management-widget'
    )!;

    // Dispatch ready event on the web component
    webComponentHtml.dispatchEvent(new CustomEvent('ready'));

    // Check that the component emits the ready event
    expect(readySpy).toHaveBeenCalledTimes(1);
  });

  describe('SSR (Server-Side Rendering)', () => {
    it('should not load widget when not in browser (SSR)', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          DescopeAuthConfig,
          { provide: DescopeAuthConfig, useValue: mockConfig },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      const ssrFixture = TestBed.createComponent(RoleManagementComponent);
      const ssrComponent = ssrFixture.componentInstance;
      ssrComponent.tenant = 'tenant-1';
      ssrComponent.widgetId = 'widget-1';

      ssrFixture.detectChanges();
      await ssrFixture.whenStable();

      // Widget should not be loaded in SSR context
      const html: HTMLElement = ssrFixture.nativeElement;
      const webComponentHtml = html.querySelector(
        'descope-role-management-widget'
      );
      expect(webComponentHtml).toBeNull();

      // Component should still be created without errors
      expect(ssrComponent).toBeTruthy();
    });
  });
});
