import { runWeb } from ".";

describe("web-sdk-test", () => {
  test("test1", async () => {
    const res = runWeb("x");
    expect(res).toContain("CORE");
    expect(res).toContain("WEB");
    expect(res).toContain("x");
  });
});
