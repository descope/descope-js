# @descope/access-key-management-widget

## Setup

### Create an `.env` file

In the widget package create an `.env` file which includes;

```
DESCOPE_BASE_URL=   # env base url
DESCOPE_PROJECT_ID= # project ID
DESCOPE_TENANT=     # tenant ID
DEBUG_MODE=         # default: "false"
DESCOPE_THEME=      # default: "light"
DESCOPE_WIDGET_ID=  # default: "access-key-management-widget"
```

### Authenticate

Use the DescopeWC in this package's `index.html`. Comment out the widget web-component from `index.html` and paste this:

```
<script src="https://cdn.jsdelivr.net/npm/@descope/access-key-management-widget/dist/index.js"></script>
<descope-wc
  base-url="<DESCOPE_BASE_URL>"
  project-id="<DESCOPE_PROJECT_ID>"
  tenant-id="<DESCOPE_TENANT>"
  debug="<DEBUG_MODE>"
  theme="<DESCOPE_THEME>""
  widget-id="<DESCOPE_WIDGET_ID>"
></descope-wc>
```

### Start the widget

run `npm start` to load the widget.

After authentication, comment out DescopeWC and remove restore the widget's web-component in `index.html`.

The widget should now run.

## Architecture

## Project Sturcture

- `/app` - contains `index.html`
- `/lib` - widget's source code
- `lib/mixins` - generic mixins (shared logic to reuse by other widgets)
- `lib/widget` - widget related implementations
- `lib/widget/api` - Logic related to API calls
- `lib/widget/drivers` - An SDK for component interaction
- `lib/widget/mixins` - Widget specific logic
- `lib/widget/state` - State managment logic

### API

---

### Mixins

The widget is composed of mixins, each mixin contains specific logic parts, and sometime exposes an API that can be used in other mixins.

Mixins can be composed on top of each other, so we can create new mixins by composing several mixins together.

#### Mixins Creators

Functions that create mixins, can get a configuration, and returns the mixin functions.

#### Singleton Mixin

Since mixins are composeable, in some cases we want to make sure a mixin is loaded only once. For example: When there is no need for its logic to run multiple times when composed in different mixins.

For this case we have a wrapper function (`createSingletonMixin`) to ensure that a mixin is loaded only once, regardless how many times it will be composed.

Mixins should be wrapped with the `createSingletonMixin` wrapper function, unless there is a reason for running the mixin's logic multiple times.

### State

We're using several tools to handle the widget's state:

- [Redux Toolkit](https://redux-toolkit.js.org/) for the widget's state managment.
- [Redux Thunk](https://github.com/reduxjs/redux-thunk) for API calls and async operations we're using
- [Reselect](https://github.com/reduxjs/reselect) to compute derived data without hitting performence or triggering state recalculation when state is not mutated.

### Drivers

An abstraction layer that provides an API for components, and enables handling interactions with components within the widget.

The motiviation to use drivers is to decouple the widget's code from the component's implementation, and therefore it's important to interact with components only using drivers (and not relying on component's implenentation details).

### UI Components

Widget UI is composed of [`@descope/web-components-ui`](https://github.com/descope/web-components-ui), which is loaded during the widget init in runtime.

For optimization, we load only the relevant components, defined on the widget screens DOM.

## Dev

### Use mock screens

Since screen are fetched dynamically, when developing a new screen for the widget you will probably want to use mock templates. To do so, simply replace the call to `fetchWidgetPage` with a string which includes your HTML.

### Use local components

In some cases you want to make changes to components anf see how it affects the widget. To do so, you need to build [`web-components-ui`](https://github.com/descope/web-components-ui) and serve the `dist` folder from your machine (with `npx serve` or other util).

Add the key `base.ui.components.url` to your localStorage and set its value to the URL of the served dist `umd/index.js` file.

###

Pay attention that _theme changes_ will not take affect until the components
