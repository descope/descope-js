## Overview

`@descope/debug-logs` is a CloudWatch RUM helper that bootstraps Descope SDKs
with consistent telemetry. It wraps AWS RUM initialization, wires multiple
custom plugins (console, navigation, DOM mutation), and exposes a single
`TelemetryManager` class so apps can enable, disable, or fully shut down
telemetry with predictable lifecycle hooks.

## When to Use

- Add observability to sample apps, SDK playgrounds, or QA harnesses without
  duplicating event plumbing.
- Validate new instrumentation before promoting it into the production SDKs.
- Run high-fidelity manual or automated tests against AWS CloudWatch RUM using
  the included standalone test page.

## Installation

```bash
pnpm add @descope/debug-logs
# or
npm install @descope/debug-logs
# or
yarn add @descope/debug-logs
```

This package ships dual ESM and CJS bundles. Type definitions live in
`dist/index.d.ts` and are referenced automatically through the `exports` map.

## Quick Start

```ts
import TelemetryManager from '@descope/debug-logs';

const manager = new TelemetryManager(
  {
    enabled: true,
    rumConfig: {
      applicationId: 'YOUR_APP_ID',
      identityPoolId: 'YOUR_ID_POOL',
      region: 'us-west-2',
      sessionSampleRate: 1,
      // guestRoleArn and endpoint are optional
    },
    capture: {
      console: { levels: ['log', 'error'] },
      network: { urlFilter: [/^https:\/\/api\./] },
      navigation: true,
      dom: { rootElement: '#app', throttleMs: 250 },
    },
  },
  {
    projectId: 'sample-app',
    flowId: 'playground',
    version: '1.2.3',
  },
);

console.log('Telemetry on');

// Later
manager.disable(); // stop recording but keep client alive
manager.enable(); // resume
manager.shutdown(); // tear down permanently
```

## Configuration Reference

| Key                           | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `enabled`                     | Gatekeeper. If `false`, nothing initializes.           |
| `rumConfig.applicationId`     | CloudWatch RUM application ID.                         |
| `rumConfig.identityPoolId`    | Cognito identity pool used by RUM.                     |
| `rumConfig.sessionSampleRate` | 0-1 float controlling sampling.                        |
| `rumConfig.endpoint`          | Optional custom ingestion endpoint.                    |
| `capture.console`             | `false`, `true`, or `{ levels: ConsoleLevel[] }`.      |
| `capture.network`             | `false`, `true`, or `{ urlFilter, maxHeaderLength }`.  |
| `capture.navigation`          | Toggle SPA navigation plugin.                          |
| `capture.dom`                 | `false`, `true`, or `{ rootElement, throttleMs }`.     |
| `context.projectId`           | Injected into session attributes.                      |
| `context.flowId`              | Additional session dimension.                          |
| `context.version`             | Overrides SDK version sent to RUM (defaults to 1.0.0). |

## Built-in Plugins

### Console plugin

- Wraps `log`, `info`, `warn`, `error`, and `debug` while preserving original
  console behavior.
- Enforces level filtering per the `capture.console.levels` array.
- Serializes complex payloads (objects, arrays) with truncation safeguards.

### Navigation plugin

- Monkey patches `history.pushState` and `history.replaceState`, and listens to
  `popstate` and `hashchange`.
- Records `{ type, from, to, timestamp }` events and automatically restores
  original methods during `disable()` or `shutdown()`.

### DOM mutation plugin

- Observes either `document.body` or a scoped `rootElement` selector.
- Aggregates `MutationRecord`s with throttling (default 100 ms) to avoid noisy
  payloads.
- Captures truncated HTML snapshots so investigators can see the exact DOM
  fragment involved.

### Network plugin

- AWS RUM's built-in HTTP telemetry (latency/error/X-Ray) remains enabled.
- A custom network plugin intercepts `fetch` and `XMLHttpRequest` to record
  request/response metadata, including all headers.
- `capture.network.urlFilter` acts as a whitelist so only approved hosts have
  headers captured.
- `capture.network.maxHeaderLength` (default 2KB per header value) prevents
  oversized payloads.

#### Network Plugin Architecture

The network plugin is organized into modular files for better maintainability:

- **`types.ts`**: Core type definitions (`HeadersMap`, `XhrMetadata`, `XhrWithMeta`) and constants (`XHR_METADATA` symbol)
- **`helpers.ts`**: 15+ pure utility functions for URL normalization, header extraction, filtering, and data transformation
- **`NetworkPlugin.ts`**: Main plugin class that patches browser APIs and orchestrates request/response capture
- **`index.ts`**: Public exports for plugin and helper functions

**Key optimizations:**

- Unified recording methods reduce code duplication between fetch and XHR paths
- Truncation function is created once and reused, not recreated per request
- Helper functions are extracted for independent testing and reusability
- Strong TypeScript types throughout with minimal use of `any`

## Lifecycle Helpers

| Method           | Purpose                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `enable()`       | Re-enables all plugins after a temporary pause.                               |
| `disable()`      | Disables plugins without disposing of the RUM client.                         |
| `shutdown()`     | Disconnects plugins, disables the RUM client, and marks the manager unusable. |
| `isReady()`      | Returns `true` when telemetry is initialized and not shut down.               |
| `getRumClient()` | Gives access to the underlying AWS RUM instance for advanced scenarios.       |

`shutdown()` is idempotent and guarded. Subsequent calls log a debug message
without throwing.

## Development Workflow

```bash
cd packages/libs/debug-logs
pnpm install          # one-time
pnpm dev              # watch mode + local test page on :5555
pnpm build            # production bundle
pnpm test             # full Jest suite (unit + integration)
pnpm lint             # eslint over src and test
```

- `rollup.config.dev.mjs` serves `test-standalone.html`, a local harness for
  manual QA.

## Manual Playground (HTML)

1. Run `pnpm dev` inside the package.
2. Navigate to `http://localhost:5555`.
3. Enter real AWS RUM credentials (app ID, identity pool, region, optional guest
   role ARN).
4. Use the console, network, navigation, and DOM buttons to emit sample events
   and confirm they show up in CloudWatch RUM.

## Troubleshooting

- **Nothing records**: Confirm `config.enabled` is `true` and that the AWS
  credentials map to a valid RUM app.
- **Network capture too noisy**: Provide a stricter `urlFilter` array.
- **DOM plugin in SSR**: Gate `dom` capture to browsers; the plugin assumes
  `document` exists.
- **Need to reuse after shutdown**: Instantiate a new `TelemetryManager`. A
  shutdown instance intentionally cannot be restarted.

## License

MIT License. See the root repository `LICENSE` file for details.
