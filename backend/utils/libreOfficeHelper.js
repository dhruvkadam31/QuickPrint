const path = require("path");
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function convertWithLibreOffice(inputPath, outputPath) {
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
      
      console.log("🔧 Executing command:", command);
      
      const { stdout, stderr } = await exec(command, { timeout: 60000 });
      
      if (stdout) console.log("✅ LibreOffice stdout:", stdout);
      if (stderr) console.log("⚠️ LibreOffice stderr:", stderr);
      
      // Check if conversion was successful
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const expectedOutput = path.join(convertedDir, `${baseName}.pdf`);
      
      if (fs.existsSync(expectedOutput)) {
        // Rename to our desired output filename
        fs.renameSync(expectedOutput, outputPath);
        console.log("✅ Document converted successfully with LibreOffice");
        return { success: true, method: librePath };
      } else {
        console.log(`❌ Expected output not found: ${expectedOutput}`);
        lastError = new Error(`Conversion completed but output file not found`);
      }
    } catch (error) {
      console.log(`❌ LibreOffice path failed: ${librePath}`, error.message);
      lastError = error;
      continue;
    }
  }
  
  throw lastError || new Error('All LibreOffice paths failed');
}

module.exports = convertWithLibreOffice;