import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ILogger } from '@descope/web-component';
import { DescopeComponent } from '../descope/descope.component';
import { DescopeAuthConfig } from '../../types/types';

@Component({
  selector: 'descope-sign-up-flow',
  standalone: true,
  imports: [DescopeComponent],
  templateUrl: './sign-up-flow.component.html'
})
export class SignUpFlowComponent {
  projectId: string;

  @Input() locale: string;
  @Input() theme: 'light' | 'dark' | 'os';
  @Input() tenant: string;
  @Input() telemetryKey: string;
  @Input() redirectUrl: string;
  @Input() autoFocus: true | false | 'skipFirstScreen';
  @Input() validateOnBlur: boolean;
  @Input() restartOnError: boolean;

  @Input() debug: boolean;
  @Input() errorTransformer: (error: { text: string; type: string }) => string;
  @Input() onScreenUpdate: (
    screenName: string,
    context: Record<string, any>,
    next: (
      interactionId: string,
      form: Record<string, any>
    ) => Promise<unknown>,
    ref: HTMLElement
  ) => boolean | Promise<boolean>;
  @Input() client: Record<string, any>;
  @Input() nonce: string;
  @Input() dismissScreenErrorOnInput: boolean;
  @Input() form: Record<string, any>;
  @Input() logger: ILogger;
  @Input() styleId: string;

  @Output() success: EventEmitter<CustomEvent> =
    new EventEmitter<CustomEvent>();
  @Output() error: EventEmitter<CustomEvent> = new EventEmitter<CustomEvent>();

  constructor(descopeConfig: DescopeAuthConfig) {
    this.projectId = descopeConfig.projectId;
  }
}
