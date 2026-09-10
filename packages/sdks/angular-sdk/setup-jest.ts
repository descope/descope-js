import 'jest-preset-angular/setup-jest';

// jsdom provides no global Response. Code under test constructs one (the flow
// success handler feeds it to the SDK's afterRequest hook), and without this a
// handler that throws is swallowed - which silently turns tests green while they
// assert nothing.
if (typeof Response === 'undefined') {
  (globalThis as unknown as { Response: unknown }).Response = class {
    private readonly body: string;

    constructor(body: string) {
      this.body = body;
    }

    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  };
}
