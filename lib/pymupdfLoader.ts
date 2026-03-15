let cachedPyMuPDF: any = null;
let loadPromise: Promise<any> | null = null;

const PYMUPDF_CDN = 'https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@0.11.14/';
const GS_CDN = 'https://cdn.jsdelivr.net/npm/@bentopdf/gs-wasm/assets/';

export interface PyMuPDFInterface {
  load(): Promise<void>;
  compressPdf(
    file: Blob,
    options: any
  ): Promise<{ blob: Blob; compressedSize: number }>;
}

export async function loadPyMuPDF(): Promise<any> {
  if (cachedPyMuPDF) {
    return cachedPyMuPDF;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const wrapperUrl = `${PYMUPDF_CDN}dist/index.js`;
      
      // We use a dynamic import with vite-ignore / webpackIgnore to bypass bundler static analysis
      // This forces the browser to load the module natively from the CDN at runtime.
      const module = await import(/* webpackIgnore: true */ /* @vite-ignore */ wrapperUrl);

      if (typeof module.PyMuPDF !== 'function') {
        throw new Error(
          'PyMuPDF module did not export expected PyMuPDF class.'
        );
      }

      cachedPyMuPDF = new module.PyMuPDF({
        assetPath: `${PYMUPDF_CDN}assets/`,
        ghostscriptUrl: GS_CDN,
      });

      await cachedPyMuPDF.load();

      console.log('[PyMuPDF Loader] Successfully loaded from CDN');
      return cachedPyMuPDF;
    } catch (error: any) {
      loadPromise = null;
      throw new Error(`Failed to load PyMuPDF from CDN: ${error.message}`);
    }
  })();

  return loadPromise;
}
