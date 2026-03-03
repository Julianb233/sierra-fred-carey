import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_uwuxpherghusguizvbvo",
  runtime: "node",
  logLevel: "log",
  dirs: ["./trigger"],
  maxDuration: 600, // 10 minutes — WhatsApp scraping + AI processing needs time
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 5000,
      maxTimeoutInMs: 60000,
      factor: 2,
      randomize: true,
    },
  },
});
