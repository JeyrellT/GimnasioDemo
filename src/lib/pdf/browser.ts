// =============================================================================
// FORJA — Puppeteer browser singleton
// Owner: document-automation-architect.
//
// Manages a single warm browser instance across the process lifetime.
// Strategy:
//   - dev  : puppeteer-core + local Chrome detected via CHROME_EXECUTABLE_PATH
//             or the standard platform paths.
//   - prod  : puppeteer-core + @sparticuz/chromium (Vercel / serverless-friendly).
//
// Consumers call getBrowser() — it launches exactly once and returns the same
// instance on every subsequent call.  closeBrowser() should be called on SIGTERM
// (registered here) and optionally in tests.
//
// If the browser cannot be launched the function throws ExternalServiceError so
// that callers can convert it to Result.err and surface a clear message to the
// operator without crashing the process.
// =============================================================================

import type { Browser, LaunchOptions as PuppeteerLaunchOptions } from "puppeteer-core";
import { ExternalServiceError } from "@/lib/errors";
import { logError, logInfo, logWarn } from "@/lib/logger";

// -----------------------------------------------------------------------------
// Singleton state
// -----------------------------------------------------------------------------

let _browser: Browser | null = null;
let _launching: Promise<Browser> | null = null;

// -----------------------------------------------------------------------------
// Internal: resolve launch options per environment
// -----------------------------------------------------------------------------

async function buildLaunchOptions(): Promise<PuppeteerLaunchOptions> {
  const isProduction = process.env.NODE_ENV === "production";

  const baseArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
    "--single-process", // required on some serverless runtimes
    "--disable-extensions",
  ];

  if (isProduction) {
    // Serverless path — @sparticuz/chromium provides a pre-compiled binary.
    // The import is dynamic so that the package is not required in dev and does
    // not fail tree-shaking on the client bundle.
    let chromiumPath: string;
    let chromiumArgs: string[];

    try {
      const chromium = (await import("@sparticuz/chromium")) as {
        default: { args: string[]; executablePath: () => Promise<string> };
      };
      chromiumPath = await chromium.default.executablePath();
      chromiumArgs = chromium.default.args;
    } catch (importErr) {
      throw new ExternalServiceError(
        "PDF_BROWSER_UNAVAILABLE",
        "No se encontró @sparticuz/chromium en producción. " +
          "Agregá 'CHROME_EXECUTABLE_PATH' como env var o instalá el paquete.",
        importErr,
      );
    }

    return {
      args: [...chromiumArgs, ...baseArgs],
      executablePath: chromiumPath,
      headless: true,
    };
  }

  // Development / CI path: prefer an env-specified binary, then fall back to
  // common installation locations.
  const executablePath = resolveLocalChrome();

  return {
    args: baseArgs,
    executablePath,
    headless: true,
    // Larger timeout gives time for slow dev machines
    timeout: 30_000,
  };
}

/**
 * Resolve a local Chrome/Chromium binary for non-production environments.
 * Returns undefined so Puppeteer can attempt its own bundled path if present.
 */
function resolveLocalChrome(): string | undefined {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  // Common installation paths by platform.
  // Only the primary path is returned; if Chrome is installed in a non-standard
  // location, set CHROME_EXECUTABLE_PATH in .env.local.
  const platform = process.platform;
  if (platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  if (platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  // Linux / CI — if no binary is found puppeteer-core will throw and we surface
  // a clear ExternalServiceError below.
  return undefined;
}

// -----------------------------------------------------------------------------
// Internal: launch a new browser instance
// -----------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  let options: PuppeteerLaunchOptions;

  try {
    options = await buildLaunchOptions();
  } catch (e) {
    // Re-throw AppError subclasses as-is; they already have the right code.
    throw e;
  }

  // Dynamic import keeps puppeteer-core out of client bundles.
  let puppeteerCore: { launch: (opts: PuppeteerLaunchOptions) => Promise<Browser> };

  try {
    puppeteerCore = (await import("puppeteer-core")) as typeof puppeteerCore;
  } catch (importErr) {
    throw new ExternalServiceError(
      "PDF_BROWSER_UNAVAILABLE",
      "puppeteer-core no está instalado. Ejecutá: pnpm add puppeteer-core@^23",
      importErr,
    );
  }

  try {
    const browser = await puppeteerCore.launch(options);
    logInfo("PDF browser lanzado", {
      pid: browser.process()?.pid,
      env: process.env.NODE_ENV,
    });
    return browser;
  } catch (launchErr) {
    throw new ExternalServiceError(
      "PDF_BROWSER_UNAVAILABLE",
      "No se pudo lanzar el browser de PDF. " +
        "En producción: configurá @sparticuz/chromium. " +
        "En dev: verificá que Chrome esté instalado o setéa CHROME_EXECUTABLE_PATH.",
      launchErr,
    );
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Returns a warm, shared Browser instance.
 * Launches exactly once per process; subsequent calls return the cached instance.
 *
 * @throws ExternalServiceError with code EXT_PDF_BROWSER_UNAVAILABLE when the
 *   browser cannot be launched (e.g., missing binary in CI).  Callers should
 *   wrap in tryCatch() or a try/catch and return Result.err.
 */
export async function getBrowser(): Promise<Browser> {
  // Return already-warm instance immediately
  if (_browser !== null) {
    // Verify the browser process is still alive
    try {
      await _browser.version(); // lightweight keepalive check
      return _browser;
    } catch {
      logWarn("PDF browser desconectado, relanzando...");
      _browser = null;
      _launching = null;
    }
  }

  // Deduplicate concurrent launch attempts — only one launch runs at a time
  if (_launching !== null) {
    return _launching;
  }

  _launching = launchBrowser().then((b) => {
    _browser = b;
    _launching = null;

    // Detect unexpected disconnects (crash, OOM kill)
    b.on("disconnected", () => {
      logWarn("PDF browser desconectado inesperadamente. Se relanzará en la próxima solicitud.");
      _browser = null;
      _launching = null;
    });

    return b;
  });

  return _launching;
}

/**
 * Gracefully closes the shared browser instance.
 * Call on SIGTERM or in test teardown.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser === null) return;

  const b = _browser;
  _browser = null;
  _launching = null;

  try {
    await b.close();
    logInfo("PDF browser cerrado limpiamente.");
  } catch (e) {
    logError(e, { context: "closeBrowser" });
  }
}

// -----------------------------------------------------------------------------
// Process signal handlers — clean shutdown
// -----------------------------------------------------------------------------

// Register once; guard against double-registration in hot-reload scenarios.
// We attach a sentinel to the global object (not process directly) to avoid
// TypeScript's "expression always truthy" warning on process existence checks.
const _global = globalThis as typeof globalThis & { _forjaPdfSigterm?: boolean };

if (!_global._forjaPdfSigterm) {
  _global._forjaPdfSigterm = true;

  process.on("SIGTERM", () => {
    closeBrowser().catch((e) => logError(e, { signal: "SIGTERM" }));
  });

  process.on("SIGINT", () => {
    closeBrowser().catch((e) => logError(e, { signal: "SIGINT" }));
  });
}
