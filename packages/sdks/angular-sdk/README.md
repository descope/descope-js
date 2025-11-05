# Descope SDK for Angular

The Descope SDK for Angular provides convenient access to the Descope for an application written on top of Angular. You can read more on the [Descope Website](https://descope.com).

## Requirements

- The SDK supports Angular version 16 and above.
- A Descope `Project ID` is required for using the SDK. Find it on the [project page in the Descope Console](https://app.descope.com/settings/project).

## Installing the SDK

Install the package with:

```bash
npm i --save @descope/angular-sdk
```

Add Descope type definitions to your `tsconfig.ts`

```
  "compilerOptions": {
    "typeRoots": ["./node_modules/@descope"],
    <other options>
  }
```

## Usage

### NgModule - Import `DescopeAuthModule` to your application

`app.module.ts`

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { DescopeAuthModule } from '@descope/angular-sdk';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    DescopeAuthModule.forRoot({
      projectId: '<your_project_id>'
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

### Standalone Mode - Configure Descope SDK for your application

`main.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { DescopeAuthConfig } from '@descope/angular-sdk';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: DescopeAuthConfig, useValue: { projectId: '<your_project_id>' } }
  ]
}).catch((err) => console.error(err));
```

### Use Descope to render specific flow

You can use **default flows** or **provide flow id** directly to the descope component

#### 1. Default flows

`app.component.html`

```angular2html
<descope-sign-in-flow
        (success)="onSuccess($event)"
        (error)="onError($event)"
        (ready)="onReady()"
></descope-sign-in-flow>
<!-- Optionally, you can show/hide loading indication until the flow page is ready -->
<div
  *ngIf="isLoading"
  class="loading-indicator"
  style="display: flex; justify-content: center; align-items: center;"
>
  Loading...
</div>
```

`app.component.ts`

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  // Optionally, you can show/hide loading indication until the flow page is ready
  // See usage in onReady() method and the html template
  isLoading = true;

  onSuccess(e: CustomEvent) {
    console.log('SUCCESSFULLY LOGGED IN', e.detail);
  }

  onError(e: CustomEvent) {
    console.log('ERROR FROM LOG IN FLOW', e.detail);
  }

  onReady() {
    this.isLoading = false;
  }
}
```

#### 2. Provide flow id

```angular2html
<descope
     flowId="<your_flow_id>"
     (success)="<your_success_function>"
     (error)="<your_error_function>"
<!-- theme can be "light", "dark" or "os", which auto select a theme based on the OS theme. Default is "light"
     theme="dark"

     locale can be any supported locale which the flow's screen translated to, if not provided, the locale is taken from the browser's locale.
     locale="en"

     debug can be set to true to enable debug mode
     debug="true"

     tenant ID for SSO (SAML) login. If not provided, Descope will use the domain of available email to choose the tenant
     tenant=<tenantId>

     Redirect URL for OAuth and SSO (will be used when redirecting back from the OAuth provider / IdP), or for "Magic Link" and "Enchanted Link" (will be used as a link in the message sent to the the user)
     redirectUrl=<redirectUrl>

     telemetryKey=<telemtry_key>

     autoFocus can be true, false or "skipFirstScreen". Default is true.
     - true: automatically focus on the first input of each screen
     - false: do not automatically focus on screen's inputs
     - "skipFirstScreen": automatically focus on the first input of each screen, except first screen
     autoFocus="skipFirstScreen"

    validateOnBlur can be true or false. Default is false.
     - true: Trigger input validation upon blur, in addition to the validation on submit
     - false: do not trigger input validation upon blur

    restartOnError can be true or false. Default is false.
     - true: In case of flow version mismatch, will restart the flow if the components version was not changed
     - false: Will not auto restart the flow in case of a flow version mismatch

     errorTransformer is a function that receives an error object and returns a string. The returned string will be displayed to the user.
     NOTE: errorTransformer is not required. If not provided, the error object will be displayed as is.
     Example:
     errorTransformer = (error: { text: string; type: string }): string => {
         const translationMap: { [key: string]: string } = {
             SAMLStartFailed: 'Failed to start SAML flow'
         };
         return translationMap[error.type] || error.text;
     };
     ...
     errorTransformer={errorTransformer}

    form is an object the initial form context that is used in screens inputs in the flow execution.
    Used to inject predefined input values on flow start such as custom inputs, custom attributes and other inputs.
    Keys passed can be accessed in flows actions, conditions and screens prefixed with "form.".
    NOTE: form is not required. If not provided, 'form' context key will be empty before user input.
    Example:
    form={{ email: "predefinedname@domain.com",  firstName: "test", "customAttribute.test": "aaaa", "myCustomInput": 12 }}

    client is an object the initial client context in the flow execution.
    Keys passed can be accessed in flows actions and conditions prefixed with "client.".
    NOTE: client is not required. If not provided, context key will be empty.
    Example:
    client={{ version: "1.2.0" }}

    Use a custom style name or keep empty to use the default style.
    styleId="my-awesome-style"

    Set a CSP nonce that will be used for style and script tags.
    nonce="rAnd0m"

    Sets the expected origin for OAuth popup communication when redirect URL is on different origin than the main application. Required for cross-origin OAuth popup flows.
    popupOrigin="https://auth.example.com"

    Clear screen error message on user input.
    dismissScreenErrorOnInput=true

     logger is an object describing how to log info, warn and errors.
     NOTE: logger is not required. If not provided, the logs will be printed to the console.
     Example:
     const logger = {
     	info: (title: string, description: string, state: any) => {
          console.log(title, description, JSON.stringify(state));
      },
     	warn: (title: string, description: string) => {
          console.warn(title);
      },
     	error: (title: string, description: string) => {
          console.error('OH NOO');
      },
     }
     ...
     logger={logger}-->
></descope>
```

### `onScreenUpdate`

A function that is called whenever there is a new screen state and after every next call. It receives the following parameters:

- `screenName`: The name of the screen that is about to be rendered
- `context`: An object containing the upcoming screen context
- `next`: A function that, when called, continues the flow execution
- `ref`: A reference to the descope-wc node

The function can be sync or async, and should return a boolean indicating whether a custom screen should be rendered:

- `true`: Render a custom screen
- `false`: Render the default flow screen

This function allows rendering custom screens instead of the default flow screens.
It can be useful for highly customized UIs or specific logic not covered by the default screens

To render a custom screen, its elements should be appended as children of the `descope` component

Usage example:

```javascript
function onScreenUpdate(screenName, context, next, ref) {
  if (screenName === 'My Custom Screen') {
    return true;
  }

  return false;
}
```

#### Standalone Mode

All components in the sdk are standalone, so you can use them by directly importing them to your components.

### Use the `DescopeAuthService` and its exposed fields (`descopeSdk`, `session$`, `user$`) to access authentication state, user details and utilities

This can be helpful to implement application-specific logic. Examples:

- Render different components if current session is authenticated
- Render user's content
- Logout button

`app.component.html`

```angular2html
<p *ngIf="!isAuthenticated"> You are not logged in</p>
<button *ngIf="isAuthenticated" (click)="logout()">LOGOUT</button>
<p>User: {{userName}}</p>
```

`app.component.ts`

```ts
import { Component, OnInit } from '@angular/core';
import { DescopeAuthService } from '@descope/angular-sdk';

@Component({
  selector: 'app-home',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isAuthenticated: boolean = false;
  userName: string = '';
  claims?: Claims;

  constructor(private authService: DescopeAuthService) {}

  ngOnInit() {
    this.authService.session$.subscribe((session) => {
      this.isAuthenticated = session.isAuthenticated;
      this.claims = session.claims;
    });
    this.authService.user$.subscribe((descopeUser) => {
      if (descopeUser.user) {
        this.userName = descopeUser.user.name ?? '';
      }
    });
  }

  logout() {
    this.authService.descopeSdk.logout();
  }
}
```

### Session Refresh

`DescopeAuthService` provides `refreshSession` and `refreshUser` methods that triggers a single request to the Descope backend to attempt to refresh the session or user. You can use them whenever you want to refresh the session/user. For example you can use `APP_INITIALIZER` provider to attempt to refresh session and user on each page refresh:

`app.module.ts`

```ts
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { DescopeAuthModule, DescopeAuthService } from '@descope/angular-sdk';
import { zip } from 'rxjs';

export function initializeApp(authService: DescopeAuthService) {
  return () => zip([authService.refreshSession(), authService.refreshUser()]);
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    DescopeAuthModule.forRoot({
      projectId: '<your_project_id>'
    })
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DescopeAuthService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

#### Standalone Mode Note:

You can use the same approach with `APP_INITIALIZER` in standalone mode, by adding it to `providers` array of the application.

### Descope Interceptor

You can also use `DescopeInterceptor` to attempt to refresh session on each HTTP request that gets `401` or `403` response:

`app.module.ts`

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import {
  HttpClientModule,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { DescopeAuthModule, descopeInterceptor } from '@descope/angular-sdk';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    DescopeAuthModule.forRoot({
      projectId: '<your_project_id>',
      pathsToIntercept: ['/protectedPath']
    })
  ],
  providers: [provideHttpClient(withInterceptors([descopeInterceptor]))],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

`DescopeInterceptor`:

- is configured for requests that urls contain one of `pathsToIntercept`. If not provided it will be used for all requests.
- attaches session token as `Authorization` header in `Bearer <token>` format
- if requests get response with `401` or `403` it automatically attempts to refresh session
- if refresh attempt is successful, it automatically retries original request, otherwise it fails with original error

**For more SDK usage examples refer to [docs](https://docs.descope.com/build/guides/client_sdks/)**

### Session token server validation (pass session token to server API)

When developing a full-stack application, it is common to have private server API which requires a valid session token:

![session-token-validation-diagram](https://docs.descope.com/static/SessionValidation-cf7b2d5d26594f96421d894273a713d8.png)

Note: Descope also provides server-side SDKs in various languages (NodeJS, Go, Python, etc). Descope's server SDKs have out-of-the-box session validation API that supports the options described bellow. To read more about session validation, Read [this section](https://docs.descope.com/build/guides/gettingstarted/#session-validation) in Descope documentation.

You can securely communicate with your backend either by using `DescopeInterceptor` or manually adding token to your requests (ie. by using `DescopeAuthService.getSessionToken()` helper function)

### Helper Functions

You can also use the following helper methods on `DescopeAuthService` to assist with various actions managing your JWT.

- `getSessionToken()` - Get current session token.
- `getRefreshToken()` - Get current refresh token. Note: Relevant only if the refresh token is stored in local storage. If the refresh token is stored in an `httpOnly` cookie, it will return an empty string.
- `isAuthenticated()` - Returns boolean whether user is authenticated
- `refreshSession` - Force a refresh on current session token using an existing valid refresh token.
- `refreshUser` - Force a refresh on current user using an existing valid refresh token.
- `isSessionTokenExpired(token = getSessionToken())` - Check whether the current session token is expired. Provide a session token if is not persisted.
- `isRefreshTokenExpired(token = getRefreshToken())` - Check whether the current refresh token is expired. Provide a refresh token if is not persisted.
- `getJwtRoles(token = getSessionToken(), tenant = '')` - Get current roles from an existing session token. Provide tenant id for specific tenant roles.
- `getJwtPermissions(token = getSessionToken(), tenant = '')` - Fet current permissions from an existing session token. Provide tenant id for specific tenant permissions.
- `getCurrentTenant(token = getSessionToken())` - Get current tenant id from an existing session token (from the `dct` claim).

### Refresh token lifecycle

Descope SDK is automatically refreshes the session token when it is about to expire. This is done in the background using the refresh token, without any additional configuration.

If the Descope project settings are configured to manage tokens in cookies.
you must also configure a custom domain, and set it as the `baseUrl` in `DescopeAuthModule`.

### Auto refresh session token

Descope SDK automatically refreshes the session token when it is about to expire. This is done in the background using the refresh token, without any additional configuration.
If you want to disable this behavior, you can pass `autoRefresh: false` to the `DescopeAuthModule` module. This will prevent the SDK from automatically refreshing the session token.

#### NgModule Example:

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { DescopeAuthModule } from '@descope/angular-sdk';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    DescopeAuthModule.forRoot({
      projectId: '<your_project_id>',
      autoRefresh: false
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

#### Standalone Mode Example:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { DescopeAuthConfig } from '@descope/angular-sdk';

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: DescopeAuthConfig,
      useValue: {
        projectId: '<your_project_id>',
        autoRefresh: false
      }
    }
  ]
}).catch((err) => console.error(err));
```

### Descope Guard

`angular-sdk` provides a convenient route guard that prevents from accessing given route for users that are not authenticated:

```ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProtectedComponent } from './protected/protected.component';
import { descopeAuthGuard } from '@descope/angular-sdk';
import { LoginComponent } from './login/login.component';

const routes: Routes = [
  {
    path: 'step-up',
    component: ProtectedComponent,
    canActivate: [descopeAuthGuard],
    data: { descopeFallbackUrl: '/' }
  },
  { path: 'login', component: LoginComponent },
  { path: '**', component: HomeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

If not authenticated user tries to access protected route they will be redirected to `descopeFallbackUrl`

### Token Persistence

Descope stores two tokens: the session token and the refresh token.

- The refresh token is either stored in local storage or an `httpOnly` cookie. This is configurable in the Descope console.
- The session token is stored in either local storage or a JS cookie. This behavior is configurable via the `sessionTokenViaCookie` prop in the `DescopeAuthModule` module.

However, for security reasons, you may choose not to store tokens in the browser. In this case, you can pass `persistTokens: false` to the `DescopeAuthModule` module. This prevents the SDK from storing the tokens in the browser.

Notes:

- You must configure the refresh token to be stored in an `httpOnly` cookie in the Descope console. Otherwise, the refresh token will not be stored, and when the page is refreshed, the user will be logged out.
- You can still retrieve the session token using the `session` observable of `DescopeAuthService`.
- The session token cookie is set to [`SameSite=Strict; Secure;`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) by default.
  If you need to customize this, you can set `sessionTokenViaCookie={sameSite: 'Lax', secure: false, cookieName: 'MY_COOKIE'}`.
  - `sameSite` (default: `Strict`) – Controls the SameSite attribute of the session cookie.
  - `secure` (default: `true`) – If true, sets the cookie as Secure (sent only over HTTPS).
  - `cookieName` (default: `DS`) – The name of the session token cookie. Useful for avoiding conflicts when running multiple Descope projects on the same domain.
  - `domain` (default: auto-detected) – The domain for the session token cookie. If not specified, uses the domain from Descope project settings or current domain.

### Last User Persistence

Descope stores the last user information in local storage. If you wish to disable this feature, you can pass `storeLastAuthenticatedUser: false` to the `DescopeAuthModule` module. Please note that some features related to the last authenticated user may not function as expected if this behavior is disabled.

### Widgets

Widgets are components that allow you to expose management features for tenant-based implementation. In certain scenarios, your customers may require the capability to perform managerial actions independently, alleviating the necessity to contact you. Widgets serve as a feature enabling you to delegate these capabilities to your customers in a modular manner.

Important Note:

- For the user to be able to use the widget, they need to be assigned the `Tenant Admin` Role.

#### User Management

The `UserManagement` widget will let you embed a user table in your site to view and take action.

The widget lets you:

- Create a new user
- Edit an existing user
- Activate / disable an existing user
- Reset an existing user's password
- Remove an existing user's passkey
- Delete an existing user

Note:

- Custom fields also appear in the table.

###### Usage

```html
<user-management tenant="tenant-id" widgetId="user-management-widget" />
```

Example:
[Manage Users](./projects/demo-app/src/app/manage-users/manage-users.component.html)

#### Role Management

The `RoleManagement` widget will let you embed a role table in your site to view and take action.

The widget lets you:

- Create a new role
- Change an existing role's fields
- Delete an existing role

Note:

- The `Editable` field is determined by the user's access to the role - meaning that project-level roles are not editable by tenant level users.
- You need to pre-define the permissions that the user can use, which are not editable in the widget.

###### Usage

```html
<role-management tenant="tenant-id" widgetId="role-management-widget" />
```

Example:
[Manage Roles](./projects/demo-app/src/app/manage-roles/manage-roles.component.html)

#### AccessKeyManagement

The `AccessKeyManagement` widget will let you embed an access key table in your site to view and take action.

The widget lets you:

- Create a new access key
- Activate / deactivate an existing access key
- Delete an exising access key

###### Usage

```html
<!-- admin view: manage all tenant users' access keys -->
<access-key-management
  tenant="tenant-id"
  widgetId="access-key-management-widget"
/>

<!-- user view: mange access key for the logged-in tenant's user -->
<access-key-management
  tenant="tenant-id"
  widgetId="user-access-key-management-widget"
/>
```

Example:
[Manage Access Keys](./projects/demo-app/src/app/manage-access-keys/manage-access-keys.component.html)

#### AuditManagement

The `AuditManagement` widget will let you embed an audit table in your site.

###### Usage

```html
<audit-management tenant="tenant-id" widgetId="audit-management-widget" />
```

Example:
[Manage Audit](./projects/demo-app/src/app/manage-audit/manage-audit.component.html)

#### UserProfile

The `UserProfile` widget lets you embed a user profile component in your app and let the logged in user update his profile.

The widget lets you:

- Update user profile picture
- Update user personal information
- Update authentication methods
- Logout

###### Usage

```angular2html
<user-profile widgetId="user-profile-widget"
(logout)="<your_logout_function>"
/>
```

Example:
[My User Profile](./projects/demo-app/src/app/my-user-profile/my-user-profile.component.html)

#### ApplicationsPortal

The `ApplicationsPortal` lets you embed an applications portal component in your app and allows the logged-in user to open applications they are assigned to.

###### Usage

```angular2html
<applications-portal widgetId="applications-portal-widget" />
```

Example:
[My User Profile](./projects/demo-app/src/app/my-applications-portal/my-applications-portal.component.html)

## Code Example

You can find an example angular app in the [examples folder](./projects/demo-app).

### Setup

To run the examples, create `environment.development.ts` file in `environments` folder.

```ts
import { Env } from './conifg';

export const environment: Env = {
  descopeProjectId: '<your_project_id>'
};
```

Find your Project ID in the [Descope console](https://app.descope.com/settings/project).

### Run Example

Run the following command in the root of the project to build and run the example:

```bash
pnpm i && npm start
```

### Example Optional Env Variables

See the following table for customization environment variables for the example app:

| Env Variable         | Description                                                                                                   | Default value     |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| descopeFlowId        | Which flow ID to use in the login page                                                                        | **sign-up-or-in** |
| descopeBaseUrl       | Custom Descope base URL                                                                                       | None              |
| descopeBaseStaticUrl | Custom Descope base static URL                                                                                | None              |
| descopeTheme         | Flow theme                                                                                                    | None              |
| descopeLocale        | Flow locale                                                                                                   | Browser's locale  |
| descopeRedirectUrl   | Flow redirect URL for OAuth/SSO/Magic Link/Enchanted Link                                                     | None              |
| descopeTenantId      | Flow tenant ID for SSO/SAML                                                                                   | None              |
| descopeDebugMode     | **"true"** - Enable debugger</br>**"false"** - Disable flow debugger                                          | None              |
| descopeStepUpFlowId  | Step up flow ID to show to logged in user (via button). e.g. "step-up". Button will be hidden if not provided | None              |
| descopeTelemetryKey  | **String** - Telemetry public key provided by Descope Inc                                                     | None              |
| descopeBackendUrl    | Url to your test backend app in case you want to test e2e                                                     | None              |

Example `environment.development.ts` file:

```ts
import { Env } from './conifg';

export const environment: Env = {
  descopeProjectId: '<your_project_id>',
  descopeBaseUrl: '<your_base_url>',
  descopeBaseStaticUrl: '<your_base_static_url>',
  descopeFlowId: 'sign-in',
  descopeDebugMode: false,
  descopeTheme: 'os',
  descopeLocale: 'en_US',
  descopeRedirectUrl: '<your_redirect_url>',
  descopeTelemetryKey: '<your_telemetry_key>',
  descopeStepUpFlowId: 'step-up',
  descopeBackendUrl: 'http://localhost:8080/protected'
};
```

## Troubleshooting

If you encounter warning during build of your application:

```
▲ [WARNING] Module 'lodash.get' used by 'node_modules/@descope/web-component/node_modules/@descope/core-js-sdk/dist/index.esm.js' is not ESM
```

add `lodash.get` to allowed CommonJS dependencies in `angular.json`

```json
"architect": {
	"build": {
		"builder": "@angular-devkit/build-angular:browser",
		"options": {
			"allowedCommonJsDependencies": ["lodash.get"],
			<other_options>
		}
		<other_config>
	}
	<other_config>
}
```

## FAQ

### I updated the user in my backend, but the user / session token are not updated in the frontend

The Descope SDK caches the user and session token in the frontend. If you update the user in your backend (using Descope Management SDK/API for example), you can call `me` / `refresh` from `descopeSdk` member of `DescopeAuthService` to refresh the user and session token. Example:

```ts
import { DescopeAuthService } from '@descope/angular-sdk';

export class MyComponent {
  // ...
  constructor(private authService: DescopeAuthService) {}

  handleUpdateUser() {
    myBackendUpdateUser().then(() => {
      this.authService.descopeSdk.me();
      // or
      this.authService.descopeSdk.refresh();
    });
  }
}
```

## Learn More

To learn more please see the [Descope Documentation and API reference page](https://docs.descope.com/).

## Contact Us

If you need help you can email [Descope Support](mailto:support@descope.com)

## License

The Descope SDK for Angular is licensed for use under the terms and conditions of the [MIT license Agreement](./LICENSE).
