const fs = require("fs");
const canvas = require("canvas");
const { DOMMatrix, Path2D } = canvas;

global.DOMMatrix = DOMMatrix;
global.Path2D = Path2D;


async function parsePDF(filePath, options = {}) {
  const {
    preservePages = false,
    removeExtraSpaces = true,
    preserveLineBreaks = true,
    debug = false,
  } = options;

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("PDF file not found");
    }

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");

    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.js");
    if (typeof pdfjs.GlobalWorkerOptions !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    }

    const pdfBuffer = fs.readFileSync(filePath);
    const parsedData = await extractPDFContent(pdfBuffer, pdfjs.default, {
      preservePages,
      removeExtraSpaces,
      preserveLineBreaks,
      debug,
    });


    return parsedData.text;
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

async function extractPDFContent(pdfBuffer, pdfjs, options) {
  try {
    // Convert the Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    const loadingTask = pdfjs.getDocument({
      data: uint8Array,  
      useSystemFonts: true, // Use system fonts
      disableFontFace: true, // Disable font face loading
    });

    const pdfDocument = await loadingTask.promise;
    const metadata = await pdfDocument.getMetadata().catch(() => ({}));
    const pageCount = pdfDocument.numPages;

    let pages = [];
    let fullText = "";

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      if (options.debug) {
        console.log(`Processing page ${pageNum}/${pageCount}`);
      }

      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Extract text with positioning information
      const pageText = textContent.items.map((item) => ({
        text: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      }));

      // Sort items by position (top to bottom, left to right)
      pageText.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 10) {
          // Threshold for same line
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

      // Clean up page resources
      page.cleanup();
    }

    // Clean up
    await loadingTask.destroy();

    return {
      text: sanitizeText(fullText, options),
      pages: options.preservePages ? pages : undefined,
      metadata: {
        title: metadata?.info?.Title || "",
        author: metadata?.info?.Author || "",
        producer: metadata?.info?.Producer || "",
        pageCount,
      },
    };
  } catch (error) {
    throw new Error(`Content extraction failed: ${error.message}`);
  }
}

function sanitizeText(text, options = {}) {
  let sanitized = text
    // Remove zero-width spaces and other invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "")
    // Replace smart quotes with regular quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace various dash types with standard dash
    .replace(/[\u2013\u2014]/g, "-")
    // Remove BOM
    .replace(/^\uFEFF/, "")
    // Normalize unicode characters
    .normalize("NFKC");

  if (options.removeExtraSpaces) {
    sanitized = sanitized
      // Remove multiple spaces
      .replace(/\s+/g, " ")
      // Remove multiple newlines if not preserving line breaks
      .replace(/\n+/g, options.preserveLineBreaks ? "\n" : " ");
  }

  return sanitized.trim();
}

module.exports = { parsePDF };
