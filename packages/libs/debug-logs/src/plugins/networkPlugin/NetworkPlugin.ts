import type { Plugin, PluginContext } from 'aws-rum-web';
import type { NetworkCaptureConfig } from '../../types';
import type { XhrMetadata, XhrWithMeta, HeadersMap } from './types';
import {
  DEFAULT_MAX_HEADER_LENGTH,
  normalizeFilters,
  truncateHeader,
  normalizeUrl,
  shouldCaptureUrl,
  extractMethod,
  extractUrl,
  extractRequestHeaders,
  extractResponseHeaders,
  parseResponseHeaders,
  safeDebugLog,
  calculateDuration,
} from './helpers';
import { XHR_METADATA } from './types';

interface NetworkRequestData {
  transport: 'fetch' | 'xhr';
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  duration: number;
  timestamp: number;
  requestHeaders: HeadersMap;
  responseHeaders: HeadersMap;
}

interface NetworkErrorData {
  transport: 'fetch' | 'xhr';
  url: string;
  method: string;
  duration: number;
  timestamp: number;
  requestHeaders: HeadersMap;
  status?: number;
  statusText?: string;
  error: string;
}

export class NetworkPlugin implements Plugin {
  private context!: PluginContext;
  private enabled = false;
  private readonly id = 'network-plugin';
  private readonly urlFilters?: RegExp[];
  private readonly maxHeaderLength: number;
  private readonly truncate: (value: string) => string;

  private originalFetch?: typeof window.fetch;
  private originalXhrOpen?: XMLHttpRequest['open'];
  private originalXhrSend?: XMLHttpRequest['send'];
  private originalXhrSetRequestHeader?: XMLHttpRequest['setRequestHeader'];

  constructor(config: NetworkCaptureConfig = {}) {
    this.urlFilters = normalizeFilters(config.urlFilter);
    this.maxHeaderLength = config.maxHeaderLength ?? DEFAULT_MAX_HEADER_LENGTH;
    this.truncate = (value: string) =>
      truncateHeader(value, this.maxHeaderLength);
  }

  load(context: PluginContext): void {
    this.context = context;
    this.enable();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    this.patchFetch();
    this.patchXhr();
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    this.restoreFetch();
    this.restoreXhr();
  }

  getPluginId(): string {
    return this.id;
  }

  private patchFetch(): void {
    if (typeof window.fetch !== 'function') {
      return;
    }

    if (!this.originalFetch) {
      this.originalFetch = window.fetch;
    }

    const originalFetch = this.originalFetch;
    const plugin = this;

    window.fetch = function (
      this: typeof window | undefined,
      ...args: Parameters<typeof fetch>
    ) {
      return plugin.handleFetch(originalFetch, args, this ?? window);
    } as typeof window.fetch;
  }

  private restoreFetch(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
  }

  private patchXhr(): void {
    if (typeof XMLHttpRequest === 'undefined') {
      return;
    }

    if (!this.originalXhrOpen) {
      this.originalXhrOpen = XMLHttpRequest.prototype.open;
      this.originalXhrSend = XMLHttpRequest.prototype.send;
      this.originalXhrSetRequestHeader =
        XMLHttpRequest.prototype.setRequestHeader;
    }

    const plugin = this;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      const xhr = this as XhrWithMeta;
      try {
        const meta = plugin.getXhrMeta(xhr);
        meta.method = (method || 'GET').toUpperCase();
        const urlString = typeof url === 'string' ? url : url?.toString() || '';
        meta.url = normalizeUrl(urlString);
      } catch (error) {
        // Metadata collection failed - log but don't break the call
        safeDebugLog('XHR metadata collection failed:', error);
      }
      // Always call original method, even if metadata collection failed
      return plugin.originalXhrOpen!.call(
        this,
        method,
        url,
        async ?? true,
        username ?? null,
        password ?? null,
      );
    };

    XMLHttpRequest.prototype.setRequestHeader = function (
      this: XMLHttpRequest,
      key: string,
      value: string,
    ): void {
      const xhr = this as XhrWithMeta;
      try {
        const meta = plugin.getXhrMeta(xhr);
        if (key) {
          meta.requestHeaders[key.toLowerCase()] = plugin.truncate(
            String(value ?? ''),
          );
        }
      } catch (error) {
        // Header capture failed - log but don't break the call
        safeDebugLog('XHR header capture failed:', error);
      }
      // Always call original method, even if header capture failed
      return plugin.originalXhrSetRequestHeader!.call(this, key, value);
    };

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const xhr = this as XhrWithMeta;
      let shouldCapture = false;

      try {
        const meta = plugin.getXhrMeta(xhr);
        meta.startTime = Date.now();

        if (!meta.url) {
          meta.url = normalizeUrl(xhr.responseURL || '');
        }

        shouldCapture = shouldCaptureUrl(meta.url || '', plugin.urlFilters);
      } catch (error) {
        // Metadata check failed - log but don't break the send
        safeDebugLog('XHR send metadata check failed:', error);
      }

      // If URL doesn't match filter or check failed, just call original
      if (!shouldCapture) {
        return plugin.originalXhrSend!.call(this, body);
      }

      // Set up event listeners for telemetry capture
      const handleLoad = () => {
        try {
          plugin.recordXhrSuccess(xhr);
        } catch (error) {
          safeDebugLog('XHR success recording failed:', error);
        }
        cleanup();
      };

      const handleError = (event: Event) => {
        try {
          plugin.recordXhrError(xhr, event.type);
        } catch (error) {
          safeDebugLog('XHR error recording failed:', error);
        }
        cleanup();
      };

      const cleanup = () => {
        try {
          xhr.removeEventListener('load', handleLoad);
          xhr.removeEventListener('error', handleError);
          xhr.removeEventListener('abort', handleError);
          xhr.removeEventListener('timeout', handleError);
          delete xhr[XHR_METADATA];
        } catch (error) {
          // Cleanup failed - not critical
          safeDebugLog('XHR cleanup failed:', error);
        }
      };

      try {
        xhr.addEventListener('load', handleLoad);
        xhr.addEventListener('error', handleError);
        xhr.addEventListener('abort', handleError);
        xhr.addEventListener('timeout', handleError);
      } catch (error) {
        // Event listener attachment failed - log but still send
        safeDebugLog('XHR event listener attachment failed:', error);
      }

      // Always call original send method
      return plugin.originalXhrSend!.call(this, body);
    };
  }

  private restoreXhr(): void {
    if (typeof XMLHttpRequest === 'undefined') {
      return;
    }

    if (this.originalXhrOpen) {
      XMLHttpRequest.prototype.open = this.originalXhrOpen;
    }
    if (this.originalXhrSend) {
      XMLHttpRequest.prototype.send = this.originalXhrSend;
    }
    if (this.originalXhrSetRequestHeader) {
      XMLHttpRequest.prototype.setRequestHeader =
        this.originalXhrSetRequestHeader;
    }
  }

  private handleFetch(
    originalFetch: typeof window.fetch,
    args: Parameters<typeof fetch>,
    thisArg: typeof window,
  ): ReturnType<typeof fetch> {
    if (!this.enabled) {
      return originalFetch.apply(thisArg, args);
    }

    const [input, init] = args;
    const url = normalizeUrl(extractUrl(input));

    if (!shouldCaptureUrl(url, this.urlFilters)) {
      return originalFetch.apply(thisArg, args);
    }

    const method = extractMethod(input, init);
    const requestHeaders = extractRequestHeaders(input, init, this.truncate);
    const startTime = Date.now();

    return originalFetch
      .apply(thisArg, args)
      .then((response) => {
        try {
          this.recordNetworkSuccess({
            transport: 'fetch',
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration: calculateDuration(startTime),
            timestamp: startTime,
            requestHeaders,
            responseHeaders: extractResponseHeaders(response, this.truncate),
          });
        } catch (recordError) {
          // Recording failed - log but don't affect the response
          safeDebugLog('Failed to record network success:', recordError);
        }
        return response;
      })
      .catch((error) => {
        try {
          this.recordNetworkError({
            transport: 'fetch',
            url,
            method,
            duration: calculateDuration(startTime),
            timestamp: startTime,
            requestHeaders,
            error: error instanceof Error ? error.message : String(error),
          });
        } catch (recordError) {
          // Recording failed - log but don't affect the error propagation
          safeDebugLog('Failed to record network error:', recordError);
        }
        // Always re-throw the original error, never the recording error
        throw error;
      });
  }

  private recordXhrSuccess(xhr: XhrWithMeta): void {
    if (!this.enabled) return;

    const meta = xhr[XHR_METADATA];
    if (!meta?.startTime || !meta.url) return;

    this.recordNetworkSuccess({
      transport: 'xhr',
      url: meta.url,
      method: meta.method || 'GET',
      status: xhr.status,
      statusText: xhr.statusText,
      duration: calculateDuration(meta.startTime),
      timestamp: meta.startTime,
      requestHeaders: meta.requestHeaders,
      responseHeaders: parseResponseHeaders(
        xhr.getAllResponseHeaders(),
        this.truncate,
      ),
    });
  }

  private recordXhrError(xhr: XhrWithMeta, type: string): void {
    if (!this.enabled) return;

    const meta = xhr[XHR_METADATA];
    if (!meta?.startTime || !meta.url) return;

    this.recordNetworkError({
      transport: 'xhr',
      url: meta.url,
      method: meta.method || 'GET',
      duration: calculateDuration(meta.startTime),
      timestamp: meta.startTime,
      requestHeaders: meta.requestHeaders,
      status: xhr.status,
      statusText: xhr.statusText,
      error: type,
    });
  }

  private recordNetworkSuccess(data: NetworkRequestData): void {
    if (!this.enabled) return;

    try {
      this.context.record('network_request', data);
    } catch (error) {
      safeDebugLog('Network plugin failed to record request:', error);
    }
  }

  private recordNetworkError(data: NetworkErrorData): void {
    if (!this.enabled) return;

    try {
      this.context.record('network_error', data);
    } catch (error) {
      safeDebugLog('Network plugin failed to record error:', error);
    }
  }

  private getXhrMeta(xhr: XhrWithMeta): XhrMetadata {
    if (!xhr[XHR_METADATA]) {
      xhr[XHR_METADATA] = {
        requestHeaders: {},
      };
    }
    return xhr[XHR_METADATA]!;
  }
}
