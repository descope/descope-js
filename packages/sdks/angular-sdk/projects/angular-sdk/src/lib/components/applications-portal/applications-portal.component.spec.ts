import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationsPortalComponent } from './applications-portal.component';
import createSdk from '@descope/web-js-sdk';
import { DescopeAuthConfig } from '../../types/types';
import { CUSTOM_ELEMENTS_SCHEMA, EventEmitter } from '@angular/core';
import mocked = jest.mocked;

jest.mock('@descope/web-js-sdk');
//Mock DescopeApplicationsPortalWidget
jest.mock('@descope/applications-portal-widget', () => {
  return jest.fn(() => {
    // Create a mock DOM element
    return document.createElement('descope-applications-portal-widget');
  });
});

describe('DescopeApplicationsPortalComponent', () => {
  let component: ApplicationsPortalComponent;
  let fixture: ComponentFixture<ApplicationsPortalComponent>;
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

    fixture = TestBed.createComponent(ApplicationsPortalComponent);
    component = fixture.componentInstance;
    component.projectId = '123';
    component.widgetId = 'widget-1';
    component.logout = new EventEmitter<CustomEvent>();
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
      'descope-applications-portal-widget'
    );
    expect(webComponentHtml).toBeDefined();
  });

  it('should correctly setup attributes based on inputs', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-applications-portal-widget'
    )!;
    expect(webComponentHtml.getAttribute('project-id')).toStrictEqual('123');
    expect(webComponentHtml.getAttribute('widget-id')).toStrictEqual(
      'widget-1'
    );
    expect(webComponentHtml.getAttribute('logger')).toBeDefined();
  });

  it('should emit logout when web component emits logout', () => {
    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-applications-portal-widget'
    )!;

    const event = {
      detail: 'logout'
    };
    component.logout.subscribe((e) => {
      expect(afterRequestHooksSpy).toHaveBeenCalled();
      expect(e.detail).toHaveBeenCalledWith(event.detail);
    });
    webComponentHtml.dispatchEvent(new CustomEvent('logout', event));
  });

  it('should emit ready event when web component dispatches ready', () => {
    const readySpy = jest.fn();
    component.ready.subscribe(readySpy);

    const html: HTMLElement = fixture.nativeElement;
    const webComponentHtml = html.querySelector(
      'descope-applications-portal-widget'
    )!;

    // Dispatch ready event on the web component
    webComponentHtml.dispatchEvent(new CustomEvent('ready'));

    // Check that the component emits the ready event
    expect(readySpy).toHaveBeenCalledTimes(1);
  });
});
