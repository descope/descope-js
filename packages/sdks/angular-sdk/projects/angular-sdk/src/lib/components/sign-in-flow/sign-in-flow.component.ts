import {
  Component,
  EventEmitter,
  Input,
  Output,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { DescopeComponent } from '../descope/descope.component';
import { DescopeAuthConfig, ILogger } from '../../types/types';

@Component({
  selector: 'descope-sign-in-flow',
  standalone: true,
  imports: [DescopeComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sign-in-flow.component.html'
})
export class SignInFlowComponent {
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
