import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { CustomWelcomeScreenComponent } from '../custom-welcome-screen/custom-welcome-screen.component';
import { DescopeAuthModule } from '../../../../angular-sdk/src/lib/descope-auth.module';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-byos-demo',
  templateUrl: './byos-demo.component.html',
  styleUrls: ['./byos-demo.component.scss'],
  standalone: true,
  imports: [CommonModule, CustomWelcomeScreenComponent, DescopeAuthModule]
})
export class ByosDemoComponent {
  // Always ensure required properties have values for the web component
  readonly flowId: string = environment.descopeFlowId || 'sign-up-or-in';

  /** Current screen state */
  state: {
    error: { text: string; type: string } | null;
    screenName?: string;
    next?: (
      interactionId: string,
      form: Record<string, unknown>
    ) => Promise<unknown>;
  } = {
    error: null,
    screenName: undefined,
    next: undefined
  };

  /** Form data for the custom page */
  form: {
    name: string;
    email: string;
  } = {
    name: '',
    email: ''
  };

  constructor(private router: Router) {}

  onScreenUpdate = (
    screenName: string,
    context: Record<string, unknown>,
    next: (
      interactionId: string,
      form: Record<string, unknown>
    ) => Promise<unknown>
  ): boolean => {
    // Update state with the current screen information
    this.state = {
      ...this.state,
      ...context,
      screenName,
      next
    };

    console.log('State:', this.state);

    // Return true to use custom screen for "Welcome Screen"
    return screenName === 'Welcome Screen';
  };

  onSuccess(event: CustomEvent): void {
    console.log('Authentication successful:', event.detail);
  }

  onError(event: CustomEvent): void {
    console.error('Authentication error:', event);
  }

  updateForm(formData: any): void {
    this.form = { ...formData };
    console.log('Form updated:', this.form);
  }

  async continueFlow(): Promise<void> {
    try {
      await this.state.next?.('Y0CB_Ne6MW', { ...this.form });
    } catch (error) {
      console.error('Error continuing flow:', error);
    }
  }
}
