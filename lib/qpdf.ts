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
  if (qpdfInstance) {
    return qpdfInstance;
  }

  qpdfInstance = (QpdfFactory as any)({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) {
        return `/qpdf/qpdf.wasm`;
      }
      if (path.endsWith('.js') || path === 'qpdf.js') {
        return `/qpdf/qpdf.js`;
      }
      return path;
    },
  });

  return qpdfInstance!;
};
