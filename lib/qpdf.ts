// @ts-ignore
import QpdfFactory from 'qpdf-wasm';

interface QpdfModule {
  callMain: (args: string[]) => number;
  FS: {
    writeFile: (file: string, data: Uint8Array) => void;
    readFile: (file: string) => Uint8Array;
    unlink: (file: string) => void;
  };
}

let qpdfInstance: Promise<QpdfModule> | null = null;

export const getQpdf = async (): Promise<QpdfModule> => {
  console.log('[getQpdf] Initializing qpdf...');
  
  if (qpdfInstance) {
    console.log('[getQpdf] Returning cached instance');
    return qpdfInstance;
  }

  console.log('[getQpdf] Creating new qpdf instance');
  qpdfInstance = (QpdfFactory as any)({
    locateFile: (path: string) => {
      console.log('[getQpdf] locateFile called with:', path);
      if (path.endsWith('.wasm')) {
        const wasmPath = `/qpdf/qpdf.wasm`;
        console.log('[getQpdf] Returning WASM path:', wasmPath);
        return wasmPath;
      }
      if (path.endsWith('.js') || path === 'qpdf.js') {
        const jsPath = `/qpdf/qpdf.js`;
        console.log('[getQpdf] Returning JS path:', jsPath);
        return jsPath;
      }
      console.log('[getQpdf] Returning original path:', path);
      return path;
    },
  });

  console.log('[getQpdf] Waiting for qpdf to initialize...');
  const result = await qpdfInstance!;
  console.log('[getQpdf] qpdf initialized successfully');
  return result;
};
