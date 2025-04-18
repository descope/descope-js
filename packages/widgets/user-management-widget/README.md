# @descope/user-management-widget

## Setup

### Create an `.env` file

In the widget package create an `.env` file which includes;

```
DESCOPE_BASE_URL=   # env base url, default: "https://app.descope.com"
DESCOPE_PROJECT_ID= # your Descope's project ID
DESCOPE_TENANT=     # tenant ID
DEBUG_MODE=         # "true" / "false", default: "false"
DESCOPE_THEME=      # "light" / "dark" / "os", default: "light"
DESCOPE_WIDGET_ID=  # default: "user-management-widget"
```

### Example

```
// replace x.x.x with the latest release of the widget: https://www.npmjs.com/package/@descope/user-management-widget
<script src="https://descopecdn.com/npm/@descope/user-management-widget@x.x.x/dist/index.js"></script>
<descope-user-management-widget
  base-url="<DESCOPE_BASE_URL>"
  project-id="<DESCOPE_PROJECT_ID>"
  tenant="<DESCOPE_TENANT>"
  debug="<DEBUG_MODE>"
  theme="<DESCOPE_THEME>"
  widget-id="<DESCOPE_WIDGET_ID>"
></descope-user-management-widget>
```

### Start the widget

run `npm start` to start the widget.

### Authenticate

In order to work with the widget, you must be logged in as the tenant admin
In case you are not authenticated, a login flow will run first, and after logging in, the widget will be rendered

## Architecture

## Project Structure

- `/app` - contains `index.html`
- `/lib` - widget's source code
- `lib/widget` - widget related implementations
- `lib/widget/api` - Logic related to API calls
- `lib/widget/mixins` - Widget specific logic
- `lib/widget/state` - State management logic

### API

---

### Mixins

The widget is composed of mixins, each mixin contains specific logic parts, and sometime exposes an API that can be used in other mixins.

Mixins can be composed on top of each other, so we can create new mixins by composing several mixins together.

#### Mixins Creators

Functions that create mixins, can get a configuration, and returns the mixin functions.

#### Singleton Mixin

Since mixins are composable, in some cases we want to make sure a mixin is loaded only once. For example: When there is no need for its logic to run multiple times when composed in different mixins.

For this case we have a wrapper function (`createSingletonMixin`) to ensure that a mixin is loaded only once, regardless how many times it will be composed.

Mixins should be wrapped with the `createSingletonMixin` wrapper function, unless there is a reason for running the mixin's logic multiple times.

### State

We're using several tools to handle the widget's state:

- [Redux Toolkit](https://redux-toolkit.js.org/) for the widget's state management.
- [Redux Thunk](https://github.com/reduxjs/redux-thunk) for API calls and async operations we're using
- [Reselect](https://github.com/reduxjs/reselect) to compute derived data without hitting performance or triggering state recalculation when state is not mutated.

### Drivers

An abstraction layer that provides an API for components, and enables handling interactions with components within the widget.

The motivation to use drivers is to decouple the widget's code from the component's implementation, and therefore it's important to interact with components only using drivers (and not relying on component's implementation details).

## Dev

### Use mock screens

Since screen are fetched dynamically, when developing a new screen for the widget you will probably want to use mock templates. To do so, simply replace the call to `fetchWidgetPage` with a string which includes your HTML.
