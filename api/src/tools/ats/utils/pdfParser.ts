import fs from "fs";
import path from "path";
import { GlobalWorkerOptions, getDocument, PDFDocumentProxy } from "pdfjs-dist";

// Polyfill global Path2D if not available
declare const Path2D: typeof globalThis.Path2D;


interface PDFOptions {
  preservePages?: boolean;
  removeExtraSpaces?: boolean;
  preserveLineBreaks?: boolean;
  debug?: boolean;
}

interface PDFMetadata {
  info?: {
    Title?: string;
    Author?: string;
    Producer?: string;
  };
  metadata?: any;
}

interface ParsedPDFData {
  text: string;
  pages?: string[];
  metadata: {
    title: string;
    author: string;
    producer: string;
    pageCount: number;
  };
}

interface PDFTextItem {
  text: string;
  x: number;
  y: number;
}



export async function parsePDF(
  filePath: string,
  options: PDFOptions = {}
): Promise<string> {
  const {
    preservePages = false,
    removeExtraSpaces = true,
    preserveLineBreaks = true,
    debug = false,
  } = options;

  console.log("Parsing PDF file:", filePath);
  // filePath = path.resolve(__dirname, `../${filePath}`)
  // console.log('Resolved file path:', filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error("PDF file not found");
  }

  try {
    // Dynamically import PDF.js and worker
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
    const pdfjsWorker: any = require("pdfjs-dist/legacy/build/pdf.worker.js");

    // Set up global worker
    if (typeof GlobalWorkerOptions !== "undefined") {
      GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    }

    const pdfBuffer = fs.readFileSync(filePath);
    const parsedData = await extractPDFContent(pdfBuffer, {
      preservePages,
      removeExtraSpaces,
      preserveLineBreaks,
      debug,
    });

    return parsedData.text;
  } catch (error) {
    throw new Error(`PDF parsing failed: ${(error as Error).message}`);
  }
}

async function extractPDFContent(
  pdfBuffer: Buffer,
  options: PDFOptions
): Promise<ParsedPDFData> {
  const uint8Array = new Uint8Array(pdfBuffer);
  const loadingTask = getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdfDocument: PDFDocumentProxy = await loadingTask.promise;
  const metadata: PDFMetadata = await pdfDocument.getMetadata().catch(() => ({}));
  const pageCount = pdfDocument.numPages;

  let pages: string[] = [];
  let fullText = "";

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (options.debug) {
      console.log(`Processing page ${pageNum}/${pageCount}`);
    }

    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText: PDFTextItem[] = textContent.items.map((item: any) => ({
      text: item.str,
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
    }));

    pageText.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const processedText = pageText
      .map((item) => item.text)
      .join(options.removeExtraSpaces ? " " : "");

    const sanitizedText = sanitizeText(processedText, options);

    if (options.preservePages) {
      pages.push(sanitizedText);
    }

    fullText += sanitizedText + (options.preserveLineBreaks ? "\n\n" : " ");
    page.cleanup();
  }

  await loadingTask.destroy();

  return {
    text: sanitizeText(fullText, options),
    pages: options.preservePages ? pages : undefined,
    metadata: {
      title: metadata?.info?.Title ?? "",
      author: metadata?.info?.Author ?? "",
      producer: metadata?.info?.Producer ?? "",
      pageCount,
    },
  };
}

function sanitizeText(text: string, options: PDFOptions = {}): string {
  let sanitized = text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/^\uFEFF/, "")
    .normalize("NFKC");

  if (options.removeExtraSpaces) {
    sanitized = sanitized
      .replace(/\s+/g, " ")
      .replace(/\n+/g, options.preserveLineBreaks ? "\n" : " ");
  }

  return sanitized.trim();
}