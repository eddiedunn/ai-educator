// Script to extract ABIs from compiled artifacts and save them to dedicated ABI files
const fs = require('fs');
const path = require('path');

// Configure paths
const artifactsDir = path.join(__dirname, '../src/abis');
const abiOutputDir = path.join(__dirname, '../src/abis/extracted');

// Ensure the output directory exists
if (!fs.existsSync(abiOutputDir)) {
  fs.mkdirSync(abiOutputDir, { recursive: true });
  console.log(`Created directory: ${abiOutputDir}`);
}

// Find all contract JSON files
function findContractFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findContractFiles(filePath, fileList);
    } else if (file.endsWith('.json') && !file.endsWith('.dbg.json')) {
      // Skip debug files
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Process contracts
async function processContracts() {
  console.log('Starting ABI extraction...');
  
  // Find all contract files
  const contractFiles = findContractFiles(artifactsDir);
  console.log(`Found ${contractFiles.length} contract files`);
  
  let extractedCount = 0;
  
  for (const file of contractFiles) {
    try {
      // Read the contract JSON
      const contractJson = JSON.parse(fs.readFileSync(file, 'utf8'));
      
      // Extract the contract name and ABI
      const contractName = contractJson.contractName;
      const abi = contractJson.abi;
      
      if (!contractName || !abi) {
        console.log(`Skipping file without contract name or ABI: ${file}`);
        continue;
      }
      
      // Create output files
      const abiOutputPath = path.join(abiOutputDir, `${contractName}.json`);
      
      // Write ABI JSON
      fs.writeFileSync(
        abiOutputPath,
        JSON.stringify(abi, null, 2)
      );
      
      // Optional: Create a separate TypeScript file with the ABI as a constant
      const tsOutputPath = path.join(abiOutputDir, `${contractName}.ts`);
      fs.writeFileSync(
        tsOutputPath,
        `// Generated ABI for ${contractName}\n` +
        `export const ${contractName}ABI = ${JSON.stringify(abi, null, 2)} as const;\n`
      );
      
      extractedCount++;
      console.log(`Extracted ABI for ${contractName}`);
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }
  
  console.log(`Successfully extracted ${extractedCount} ABIs to ${abiOutputDir}`);
  console.log('ABI extraction complete!');
}

// Execute
processContracts().catch(error => {
  console.error('Error during ABI extraction:', error);
  process.exit(1);
}); 