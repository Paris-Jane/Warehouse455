import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";

import type { ScoringProvider, ScoringResult } from "./types";

const DEFAULT_TIMEOUT_MS = 120_000;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… (truncated)`;
}

function parseOrdersScored(stdout: string, stderr: string): number | undefined {
  const text = `${stdout}\n${stderr}`;
  const patterns = [
    /orders[_\s-]?scored\s*[:=]\s*(\d+)/i,
    /RESULT\s+orders_scored=(\d+)/i,
    /scored\s+(\d+)\s+orders/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number.parseInt(m[1]!, 10);
  }
  return undefined;
}

/**
 * Adapter for a future Python pipeline. The app only spawns the process and
 * captures output; implement real inference inside `jobs/run_inference.py`.
 */
export function createPythonScriptScoringProvider(): ScoringProvider {
  return {
    key: "python",
    async scoreOpenOrders(): Promise<ScoringResult> {
      const ts = new Date().toISOString();
      const cwd = process.cwd();
      const script = path.join("jobs", "run_inference.py");

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      try {
        const result = await new Promise<{
          code: number | null;
          stdout: string;
          stderr: string;
        }>((resolve, reject) => {
          const child = spawn("python", [script], {
            cwd,
            env: { ...process.env },
            stdio: ["ignore", "pipe", "pipe"],
          });

          const onTimeout = setTimeout(() => {
            try {
              child.kill("SIGTERM");
            } catch {
              /* ignore */
            }
            reject(new Error(`Scoring timed out after ${DEFAULT_TIMEOUT_MS}ms`));
          }, DEFAULT_TIMEOUT_MS);

          child.stdout?.on("data", (d: Buffer) => stdoutChunks.push(d));
          child.stderr?.on("data", (d: Buffer) => stderrChunks.push(d));

          child.on("error", (err) => {
            clearTimeout(onTimeout);
            reject(err);
          });

          child.on("close", (code) => {
            clearTimeout(onTimeout);
            resolve({
              code,
              stdout: Buffer.concat(stdoutChunks).toString("utf8"),
              stderr: Buffer.concat(stderrChunks).toString("utf8"),
            });
          });
        });

        const stdoutPreview = truncate(result.stdout, 4000);
        const stderrPreview = truncate(result.stderr, 4000);

        if (result.code !== 0) {
          return {
            ok: false,
            provider: "python",
            timestamp: ts,
            ordersScored: parseOrdersScored(result.stdout, result.stderr),
            stdoutPreview,
            stderrPreview,
            errorMessage: `Python process exited with code ${result.code}`,
          };
        }

        return {
          ok: true,
          provider: "python",
          timestamp: ts,
          ordersScored: parseOrdersScored(result.stdout, result.stderr),
          stdoutPreview,
          stderrPreview,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const stdout = Buffer.concat(stdoutChunks).toString("utf8");
        const stderr = Buffer.concat(stderrChunks).toString("utf8");
        return {
          ok: false,
          provider: "python",
          timestamp: ts,
          ordersScored: parseOrdersScored(stdout, stderr),
          stdoutPreview: truncate(stdout, 4000),
          stderrPreview: truncate(stderr, 4000),
          errorMessage: message,
        };
      }
    },
  };
}
