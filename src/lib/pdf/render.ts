// =============================================================================
// BLACKLINE FITNESS — HTML → PDF renderer
// Owner: document-automation-architect.
//
// Thin wrapper around the Puppeteer Page API.
// Receives an HTML string (already rendered by the template layer), opens a
// new page, injects the HTML, waits for network resources (fonts), renders the
// PDF and returns a Buffer.
//
// The shared Browser singleton is managed by ./browser.ts — this module never
// launches or closes the browser; it only borrows a page.
// =============================================================================

import type { PDFOptions } from "puppeteer-core";
import { getBrowser } from "./browser";
import { logInfo, logError } from "@/lib/logger";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PdfMargins {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface HtmlToPdfOptions {
  format?: "A4" | "Letter";
  printBackground?: boolean;
  margin?: PdfMargins;
  /**
   * Extra milliseconds to wait after 'networkidle0' before printing.
   * Useful when a webfont CDN is slow in a particular environment.
   * Default: 0 (no extra wait).
   */
  extraWaitMs?: number;
  /**
   * Puppeteer displayHeaderFooter options.
   * In MVP footers are embedded in the HTML itself, so these default to false.
   */
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

// -----------------------------------------------------------------------------
// Default options — aligned with BLACKLINE FITNESS print layout (A4, light mode)
// -----------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<
  Pick<HtmlToPdfOptions, "format" | "printBackground" | "margin" | "extraWaitMs" | "displayHeaderFooter">
> = {
  format: "A4",
  printBackground: true, // required so --brand-primary blue prints
  margin: {
    top: "20mm",
    right: "15mm",
    bottom: "20mm",
    left: "15mm",
  },
  extraWaitMs: 0,
  displayHeaderFooter: false,
};

// -----------------------------------------------------------------------------
// Core function
// -----------------------------------------------------------------------------

/**
 * Converts an HTML string to a PDF Buffer.
 *
 * Lifecycle per call:
 *   1. Borrow a Page from the shared Browser.
 *   2. Set viewport to A4 px equivalent.
 *   3. Inject HTML and wait for network idle (fonts, images).
 *   4. Optional: wait extraWaitMs for slow CDN fonts.
 *   5. Generate PDF with print-optimized options.
 *   6. Close the page (NOT the browser).
 *   7. Return Buffer.
 *
 * @throws ExternalServiceError (from getBrowser) if the browser is unavailable.
 * @throws Error (wrapped as InternalError by tryCatch at callers) on page errors.
 */
export async function htmlToPdf(input: {
  html: string;
  options?: HtmlToPdfOptions;
}): Promise<Buffer> {
  const { html, options = {} } = input;

  const resolved = {
    format: options.format ?? DEFAULT_OPTIONS.format,
    printBackground: options.printBackground ?? DEFAULT_OPTIONS.printBackground,
    margin: {
      top: options.margin?.top ?? DEFAULT_OPTIONS.margin.top,
      right: options.margin?.right ?? DEFAULT_OPTIONS.margin.right,
      bottom: options.margin?.bottom ?? DEFAULT_OPTIONS.margin.bottom,
      left: options.margin?.left ?? DEFAULT_OPTIONS.margin.left,
    },
    extraWaitMs: options.extraWaitMs ?? DEFAULT_OPTIONS.extraWaitMs,
    displayHeaderFooter: options.displayHeaderFooter ?? DEFAULT_OPTIONS.displayHeaderFooter,
    headerTemplate: options.headerTemplate ?? "",
    footerTemplate: options.footerTemplate ?? "",
  } satisfies Required<HtmlToPdfOptions>;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // A4 at 96 dpi → 794 × 1123 px
    await page.setViewport({ width: 794, height: 1123 });

    // Inject HTML; networkidle0 waits for webfonts, images, etc.
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });

    // Optional extra wait for slow CDN font loads
    if (resolved.extraWaitMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, resolved.extraWaitMs));
    }

    const pdfOptions: PDFOptions = {
      format: resolved.format,
      printBackground: resolved.printBackground,
      margin: resolved.margin,
      displayHeaderFooter: resolved.displayHeaderFooter,
      ...(resolved.displayHeaderFooter
        ? {
            headerTemplate: resolved.headerTemplate,
            footerTemplate: resolved.footerTemplate,
          }
        : {}),
    };

    const pdfUint8 = await page.pdf(pdfOptions);
    const buffer = Buffer.from(pdfUint8);

    logInfo("PDF generado", { bytes: buffer.byteLength, format: resolved.format });

    return buffer;
  } catch (e) {
    logError(e, { context: "htmlToPdf" });
    throw e; // re-throw; tryCatch() at index.ts boundary converts to Result.err
  } finally {
    // Always close the page — never close the browser (it's shared).
    await page.close().catch((closeErr: unknown) =>
      logError(closeErr, { context: "htmlToPdf.pageClose" }),
    );
  }
}
