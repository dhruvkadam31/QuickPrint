const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pdf = require("pdf-parse");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const convertWithLibreOffice = async (inputPath, outputPath) => {
  const convertedDir = path.dirname(outputPath);
  
  const libreOfficePaths = [
    '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"',
    '"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"',
    'soffice',
    'libreoffice',
  ];

  let lastError = null;

  for (const librePath of libreOfficePaths) {
    try {
      console.log(`🔄 Trying LibreOffice path: ${librePath}`);
      
      const command = `${librePath} --headless --convert-to pdf --outdir "${convertedDir}" "${inputPath}"`;
      
      const { stdout, stderr } = await exec(command, { timeout: 60000 });
      
      if (stdout) console.log("✅ LibreOffice stdout:", stdout);
      if (stderr) console.log("⚠️ LibreOffice stderr:", stderr);
      
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const expectedOutput = path.join(convertedDir, `${baseName}.pdf`);
      
      if (fs.existsSync(expectedOutput)) {
        fs.renameSync(expectedOutput, outputPath);
        return { success: true, method: librePath };
      }
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  
  throw lastError || new Error('All LibreOffice paths failed');
};

const convertImageToPDF = async (inputPath, outputPath) => {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    const pdfBuffer = await image
      .resize({
        width: 595,
        height: 842,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat('pdf')
      .toBuffer();
    
    fs.writeFileSync(outputPath, pdfBuffer);
    return { success: true, method: 'sharp' };
  } catch (error) {
    console.error("❌ Sharp conversion failed:", error.message);
    return { success: false, error };
  }
};

const countPDFPages = async (pdfPath) => {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(pdfBuffer);
    return pdfData.numpages ?? pdfData.numPages ?? 1;
  } catch (error) {
    console.error("❌ Page counting failed:", error);
    return 1;
  }
};

module.exports = {
  convertWithLibreOffice,
  convertImageToPDF,
  countPDFPages
};