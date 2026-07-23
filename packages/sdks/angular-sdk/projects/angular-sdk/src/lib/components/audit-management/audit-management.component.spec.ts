import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditManagementComponent } from './audit-management.component';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
//Mock DescopeAuditManagementWidget
jest.mock('@descope/audit-management-widget', () => {
  return jest.fn(() => {
    // Create a mock DOM element
    return document.createElement('descope-audit-management-widget');
  });
});

describe('DescopeAuditManagementComponent', () => {
  let component: AuditManagementComponent;
  let fixture: ComponentFixture<AuditManagementComponent>;
  let mockedCreateSdk: jest.Mock;
  const afterRequestHooksSpy = jest.fn();
  const mockConfig: DescopeAuthConfig = {
    projectId: 'someProject'
  };

  beforeEach(() => {
    mockedCreateSdk = mocked(createSdk);

    mockedCreateSdk.mockReturnValue({
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

    fixture = TestBed.createComponent(AuditManagementComponent);
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
      'descope-audit-management-widget'
    );
    expect(webComponentHtml).toBeDefined();
  });

  it('should correctly setup attributes based on inputs', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-audit-management-widget'
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
      'descope-audit-management-widget'
    )!;

    // Dispatch ready event on the web component
    webComponentHtml.dispatchEvent(new CustomEvent('ready'));

    // Check that the component emits the ready event
    expect(readySpy).toHaveBeenCalledTimes(1);
  });
});
