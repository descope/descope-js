import { runCore } from "core-sdk";

export function runWeb(x: string) {
  return `WEB: [${runCore(x)}]`;
}
