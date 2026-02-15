import { getQpdf } from './qpdf';

export interface EncryptOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    print?: 'full' | 'low' | 'none';
    modify?: 'all' | 'annotate' | 'form' | 'assembly' | 'none';
    extract?: boolean;
    annotate?: boolean;
  }
}

export const decryptPdf = async (
  file: File,
  password: string
): Promise<Blob> => {
  const qpdf = await getQpdf();
  const filename = file.name;
  const outputFilename = `decrypted_${filename}`;
  const inputPath = `/${filename}`;
  const outputPath = `/${outputFilename}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    qpdf.FS.writeFile(inputPath, data);

    const args = [
      `--password=${password}`,
      '--decrypt',
      inputPath,
      outputPath
    ];

    const exitCode = qpdf.callMain(args);

    if (exitCode !== 0) {
      throw new Error(`qpdf exited with code ${exitCode}`);
    }

    const decryptedData = qpdf.FS.readFile(outputPath);
    return new Blob([decryptedData], { type: 'application/pdf' });
  } catch (error) {
    console.error('PDF Decryption failed:', error);
    throw error;
  } finally {
    try {
      qpdf.FS.unlink(inputPath);
      qpdf.FS.unlink(outputPath);
    } catch (e) {
      // ignore
    }
  }
};

export const encryptPdf = async (
  file: File,
  options: EncryptOptions
): Promise<Blob> => {
  const qpdf = await getQpdf();
  const filename = file.name;
  const outputFilename = `encrypted_${filename}`;
  const inputPath = `/${filename}`;
  const outputPath = `/${outputFilename}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Write input file to virtual FS
    qpdf.FS.writeFile(inputPath, data);

    const userPwd = options.userPassword || '';
    const ownerPwd = options.ownerPassword || userPwd || 'owner'; // Fallback owner password if not provided

    // Construct arguments for qpdf
    // qpdf --encrypt user-password owner-password 256 [restrictions] -- input output
    const args = [
      '--encrypt',
      userPwd,
      ownerPwd,
      '256'
    ];

    if (options.permissions) {
        if (options.permissions.print) args.push(`--print=${options.permissions.print}`);
        if (options.permissions.modify) args.push(`--modify=${options.permissions.modify}`);
        if (options.permissions.extract === false) args.push('--extract=n');
        if (options.permissions.annotate === false) args.push('--annotate=n');
    }

    args.push(
      '--',
      inputPath,
      outputPath
    );

    const exitCode = qpdf.callMain(args);

    if (exitCode !== 0) {
      throw new Error(`qpdf exited with code ${exitCode}`);
    }

    // Read the encrypted file
    const encryptedData = qpdf.FS.readFile(outputPath);
    
    // Create Blob from the data
    const blob = new Blob([encryptedData], { type: 'application/pdf' });

    return blob;

  } catch (error) {
    console.error('PDF Encryption failed:', error);
    throw error;
  } finally {
    // Clean up virtual FS
    try {
      qpdf.FS.unlink(inputPath);
      qpdf.FS.unlink(outputPath);
    } catch (e) {
      // Ignore cleanup errors (file might not exist if creation failed)
    }
  }
};
