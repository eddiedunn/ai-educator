#!/bin/bash

# Deploy to Base Sepolia Script
# This script automates the entire deployment process to Base Sepolia

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize variables
AUTO_YES=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -y|--yes) AUTO_YES=true; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Check for required commands
check_requirements() {
  section "Checking System Requirements"
  
  # List of required commands
  commands=("node" "npm" "npx" "grep" "sed" "awk")
  missing=()
  
  for cmd in "${commands[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
      missing+=("$cmd")
    fi
  done
  
  if [ ${#missing[@]} -gt 0 ]; then
    error "The following required commands are missing: ${missing[*]}"
  fi
  
  # Check node version
  node_version=$(node -v | cut -d'v' -f2)
  node_major=$(echo "$node_version" | cut -d'.' -f1)
  
  if [ "$node_major" -lt 16 ]; then
    warning "Node.js version $node_version detected. This script is optimized for Node.js 16 or later."
    if [ "$AUTO_YES" = false ]; then
      read -p "Continue anyway? (y/n): " continue_anyway
      if [[ $continue_anyway != [yY] && $continue_anyway != [yY][eE][sS] ]]; then
        exit 1
      fi
    else
      echo "Auto-answering: yes"
    fi
  else
    success "Node.js version $node_version detected"
  fi
  
  # OS detection for compatibility warnings
  if [[ "$OSTYPE" == "darwin"* ]]; then
    success "macOS detected - using macOS-compatible commands"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    success "Linux detected - using Linux-compatible commands"
  else
    warning "Unrecognized OS: $OSTYPE - this script is optimized for macOS and Linux"
    if [ "$AUTO_YES" = false ]; then
      read -p "Continue anyway? (y/n): " continue_anyway
      if [[ $continue_anyway != [yY] && $continue_anyway != [yY][eE][sS] ]]; then
        exit 1
      fi
    else
      echo "Auto-answering: yes"
    fi
  fi
}

# Function to print section headers
section() {
  echo -e "\n${BLUE}========== $1 ==========${NC}\n"
}

# Function to print success messages
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warnings
warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print errors and exit
error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  exit 1
}

# Check if .env file exists
check_env_file() {
  section "Checking Environment Configuration"
  
  if [ ! -f .env ]; then
    warning ".env file not found. Creating from .env.sample..."
    if [ -f .env.sample ]; then
      cp .env.sample .env
      echo "Created .env file from template. Please edit it with your specific values."
      if [ "$AUTO_YES" = false ]; then
        editor .env
      else
        echo "Skipping interactive editor in auto mode. Please configure .env manually."
      fi
    else
      error ".env.sample template not found. Please create a .env file manually."
    fi
  else
    success ".env file found"
  fi
  
  # Check for required variables
  required_vars=("BASE_SEPOLIA_RPC_URL" "PRIVATE_KEY" "CHAINLINK_DON_ID")
  missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
      missing_vars+=("$var")
    fi
  done
  
  if [ ${#missing_vars[@]} -gt 0 ]; then
    warning "Missing required environment variables: ${missing_vars[*]}"
    echo "Please add them to your .env file"
    if [ "$AUTO_YES" = false ]; then
      read -p "Press Enter to continue after updating your .env file..."
    else
      echo "Auto-continuing without waiting in auto mode."
    fi
  else
    success "All required environment variables found"
  fi
}

# Install dependencies
install_dependencies() {
  section "Installing Dependencies"
  npm install || error "Failed to install dependencies"
  success "Dependencies installed"
}

# Compile contracts
compile_contracts() {
  section "Compiling Smart Contracts"
  npm run compile || error "Failed to compile contracts"
  success "Contracts compiled successfully"
}

# Deploy contracts to Base Sepolia
deploy_contracts() {
  section "Deploying Contracts to Base Sepolia"
  echo "This will deploy PuzzlePoints, ChainlinkAnswerVerifier, and QuestionManager contracts to Base Sepolia."
  
  if [ "$AUTO_YES" = false ]; then
    read -p "Continue? (y/n): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
      warning "Deployment canceled"
      exit 0
    fi
  else
    echo "Auto-answering: yes"
  fi
  
  npx hardhat run scripts/deploy-base-sepolia.js --network baseSepoliaTestnet || error "Contract deployment failed"
  
  # Check if addresses.json exists and was updated
  if [ -f deployments/addresses.json ]; then
    success "Contracts deployed successfully!"
    echo "Deployed contract addresses:"
    grep -A 5 "baseSepoliaTestnet" deployments/addresses.json
  else
    error "Deployment might have failed. No addresses.json file found."
  fi
}

# Extract ABIs from contract artifacts
extract_abis() {
  section "Extracting Contract ABIs"
  npm run extract-abis || error "Failed to extract ABIs"
  success "ABIs extracted successfully to src/abis/extracted/"
}

# Extract address from deployments/addresses.json in a cross-platform way
extract_address() {
  local contract_name="$1"
  local file="$2"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # MacOS approach (uses grep and awk)
    grep -A 1 "\"$contract_name\":" "$file" | grep -E "\"$contract_name\":|[0-9a-fA-F]{40}" | awk -F'"' '/0x/ {print $4}'
  else
    # Linux approach (uses grep -oP)
    grep -A 1 "\"$contract_name\":" "$file" | grep -oP "(?<=\"$contract_name\": \")[^\"]*"
  fi
}

# Update frontend configuration
update_frontend_config() {
  section "Updating Frontend Configuration"
  
  # Determine if we're using the new config.json approach
  if [ -f src/config/config.json ]; then
    echo "Using config.json approach for frontend configuration..."
    node scripts/update-config.js baseSepoliaTestnet || error "Failed to update config.json"
    success "Updated config.json with deployment addresses"
  else
    echo "Using traditional approach for frontend configuration..."
    # Legacy approach - updating src/config.js directly
    echo "Extracting contract addresses from deployment..."
    
    PUZZLE_POINTS=$(extract_address "PuzzlePoints" deployments/addresses.json)
    QUESTION_MANAGER=$(extract_address "QuestionManager" deployments/addresses.json)
    CHAINLINK_VERIFIER=$(extract_address "ChainlinkAnswerVerifier" deployments/addresses.json)
    
    echo "Updating src/config.js with contract addresses..."
    
    # Check if we're on MacOS or Linux and use appropriate sed syntax
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # MacOS version of sed requires an empty string as extension
      sed -i '' "s|puzzlePoints: '[^']*'|puzzlePoints: '$PUZZLE_POINTS'|g" src/config.js
      sed -i '' "s|questionManager: '[^']*'|questionManager: '$QUESTION_MANAGER'|g" src/config.js
      
      # Also update .env file with contract addresses for Hardhat tasks
      echo "Updating .env file with contract addresses..."
      sed -i '' "s|PUZZLEPOINTS_ADDRESS=.*|PUZZLEPOINTS_ADDRESS=$PUZZLE_POINTS|g" .env
      sed -i '' "s|QUESTIONMANAGER_ADDRESS=.*|QUESTIONMANAGER_ADDRESS=$QUESTION_MANAGER|g" .env
      sed -i '' "s|CHAINLINKANSWERVERIFIER_ADDRESS=.*|CHAINLINKANSWERVERIFIER_ADDRESS=$CHAINLINK_VERIFIER|g" .env
    else
      # Linux version of sed
      sed -i "s|puzzlePoints: '[^']*'|puzzlePoints: '$PUZZLE_POINTS'|g" src/config.js
      sed -i "s|questionManager: '[^']*'|questionManager: '$QUESTION_MANAGER'|g" src/config.js
      
      # Also update .env file with contract addresses for Hardhat tasks
      echo "Updating .env file with contract addresses..."
      sed -i "s|PUZZLEPOINTS_ADDRESS=.*|PUZZLEPOINTS_ADDRESS=$PUZZLE_POINTS|g" .env
      sed -i "s|QUESTIONMANAGER_ADDRESS=.*|QUESTIONMANAGER_ADDRESS=$QUESTION_MANAGER|g" .env
      sed -i "s|CHAINLINKANSWERVERIFIER_ADDRESS=.*|CHAINLINKANSWERVERIFIER_ADDRESS=$CHAINLINK_VERIFIER|g" .env
    fi
    
    success "Updated frontend configuration with contract addresses"
  fi
}

# Setup Chainlink Functions
setup_chainlink() {
  section "Setting Up Chainlink Functions"
  
  echo "1/2: Setting up connection between QuestionManager and ChainlinkAnswerVerifier..."
  npx hardhat setup-chainlink --network baseSepoliaTestnet || error "Failed to setup Chainlink connection"
  success "Connection established between contracts"
  
  echo "2/2: Updating ChainlinkAnswerVerifier with source code and configuration..."
  npx hardhat update-chainlink --network baseSepoliaTestnet || error "Failed to update Chainlink configuration"
  success "Chainlink Functions configured successfully"
}

# Test deployment
test_deployment() {
  section "Testing Deployment"
  
  echo "1/3: Testing Chainlink setup..."
  npm run test:chainlink-setup || warning "Chainlink setup test reported issues"
  
  echo "2/3: Testing gas estimation..."
  npm run test:gas-estimate || warning "Gas estimation test reported issues"
  
  echo "3/3: Running comprehensive diagnostics..."
  npm run chainlink:diagnose || warning "Diagnostics reported issues"
  
  success "Testing completed!"
}

# Verify contracts on Basescan (optional)
verify_contracts() {
  if [ "$AUTO_YES" = false ]; then
    read -p "Do you want to verify contracts on Basescan? (y/n): " verify
  else
    verify="y"
    echo "Auto-answering: yes for contract verification"
  fi
  
  if [[ $verify == [yY] || $verify == [yY][eE][sS] ]]; then
    section "Verifying Contracts on Basescan"
    
    echo "Extracting contract addresses..."
    # Explicitly specify the baseSepoliaTestnet network
    ADDRESSES_FILE="deployments/addresses.json"
    NETWORK="baseSepoliaTestnet"
    
    # Read the addresses directly from addresses.json for the specified network
    if [ -f "$ADDRESSES_FILE" ]; then
      PUZZLE_POINTS=$(grep -A 3 "\"$NETWORK\"" $ADDRESSES_FILE | grep "PuzzlePoints" | cut -d'"' -f4)
      CHAINLINK_VERIFIER=$(grep -A 3 "\"$NETWORK\"" $ADDRESSES_FILE | grep "ChainlinkAnswerVerifier" | cut -d'"' -f4)
      QUESTION_MANAGER=$(grep -A 3 "\"$NETWORK\"" $ADDRESSES_FILE | grep "QuestionManager" | cut -d'"' -f4)
      
      echo "Using addresses for $NETWORK:"
      echo "PuzzlePoints: $PUZZLE_POINTS"
      echo "ChainlinkAnswerVerifier: $CHAINLINK_VERIFIER"
      echo "QuestionManager: $QUESTION_MANAGER"
    else
      error "Could not find addresses file at $ADDRESSES_FILE"
      return 1
    fi
    
    # Source .env file to get Router address and DON ID
    source .env
    ROUTER_ADDRESS=${FUNCTIONS_ROUTER_ADDRESS:-"0xde18200413f4b050a800590a6bca4e7eb7c24963"}
    
    # Format the DON ID properly - need to use the raw hex string without 0x prefix for verification
    DON_ID_RAW=${CHAINLINK_DON_ID:-"66756e2d62617365736570"}
    # Remove 0x prefix if present
    DON_ID_RAW=${DON_ID_RAW#0x}
    # The format expected by the verifier
    DON_ID="0x$DON_ID_RAW"

    echo "Verifying PuzzlePoints contract..."
    npx hardhat verify --network baseSepoliaTestnet $PUZZLE_POINTS || warning "Failed to verify PuzzlePoints contract"
    
    echo "Verifying ChainlinkAnswerVerifier contract..."
    npx hardhat verify --network baseSepoliaTestnet $CHAINLINK_VERIFIER $ROUTER_ADDRESS $DON_ID || warning "Failed to verify ChainlinkAnswerVerifier contract"
    
    echo "Verifying QuestionManager contract..."
    # QuestionManager only takes one parameter - the PuzzlePoints address
    npx hardhat verify --network baseSepoliaTestnet $QUESTION_MANAGER $PUZZLE_POINTS || warning "Failed to verify QuestionManager contract"
    
    success "Contract verification completed"
  else
    echo "Skipping contract verification."
  fi
}

# Create config.json structure (if requested)
setup_config_json() {
  section "Setting Up config.json (Optional)"
  
  if [ "$AUTO_YES" = false ]; then
    read -p "Do you want to set up the config.json structure for better configuration management? (y/n): " confirm
  else
    confirm="y"
    echo "Auto-answering: yes for config.json setup"
  fi
  
  if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    warning "config.json setup skipped"
    return
  fi
  
  # Create config directory if it doesn't exist
  mkdir -p src/config
  
  # Get contract addresses
  PUZZLE_POINTS=$(extract_address "PuzzlePoints" deployments/addresses.json)
  QUESTION_MANAGER=$(extract_address "QuestionManager" deployments/addresses.json)
  CHAINLINK_VERIFIER=$(extract_address "ChainlinkAnswerVerifier" deployments/addresses.json)
  
  # Create config.json
  echo '{
  "development": {
    "blockchain": {
      "chainId": "84532",
      "rpcUrl": "https://sepolia.base.org",
      "networkName": "Base Sepolia Testnet",
      "blockExplorer": "https://sepolia.basescan.org"
    },
    "contracts": {
      "puzzlePoints": "'$PUZZLE_POINTS'",
      "questionManager": "'$QUESTION_MANAGER'",
      "chainlinkAnswerVerifier": "'$CHAINLINK_VERIFIER'"
    },
    "apis": {
      "openai": {
        "model": "gpt-4o-mini",
        "endpointUrl": "/api/openai-proxy"
      }
    },
    "ipfs": {
      "enabled": false,
      "gateway": "https://ipfs.io/ipfs/",
      "node": {
        "host": "ipfs.infura.io",
        "port": 5001,
        "protocol": "https"
      }
    }
  },
  "production": {
    "blockchain": {
      "chainId": "84532",
      "rpcUrl": "https://sepolia.base.org",
      "networkName": "Base Sepolia Testnet",
      "blockExplorer": "https://sepolia.basescan.org"
    },
    "contracts": {
      "puzzlePoints": "'$PUZZLE_POINTS'",
      "questionManager": "'$QUESTION_MANAGER'",
      "chainlinkAnswerVerifier": "'$CHAINLINK_VERIFIER'"
    },
    "apis": {
      "openai": {
        "model": "gpt-4o-mini",
        "endpointUrl": "/api/openai-proxy"
      }
    },
    "ipfs": {
      "enabled": false,
      "gateway": "https://ipfs.io/ipfs/",
      "node": {
        "host": "ipfs.infura.io",
        "port": 5001,
        "protocol": "https"
      }
    }
  },
  "test": {
    "blockchain": {
      "chainId": "31337",
      "rpcUrl": "http://127.0.0.1:8545",
      "networkName": "Hardhat Local",
      "blockExplorer": ""
    },
    "contracts": {
      "puzzlePoints": "",
      "questionManager": "",
      "chainlinkAnswerVerifier": ""
    },
    "apis": {
      "openai": {
        "model": "gpt-3.5-turbo",
        "endpointUrl": "/api/openai-proxy"
      }
    },
    "ipfs": {
      "enabled": false,
      "gateway": "https://ipfs.io/ipfs/",
      "node": {
        "host": "localhost",
        "port": 5001,
        "protocol": "http"
      }
    }
  }
}' > src/config/config.json

  # Create configManager.js
  echo "import configData from './config.json';

// Determine the current environment
const getEnvironment = () => {
  return process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';
};

// Get the configuration for the current environment
export const getConfig = () => {
  const env = getEnvironment();
  return configData[env] || configData.development;
};

// Get blockchain configuration
export const getBlockchainConfig = () => {
  return getConfig().blockchain;
};

// Get contract addresses
export const getContractAddresses = () => {
  return getConfig().contracts;
};

// Get API configurations
export const getApiConfig = (apiName) => {
  return getConfig().apis[apiName];
};

// Get OpenAI configuration
export const getOpenAIConfig = () => {
  return getApiConfig('openai');
};

// Get IPFS configuration
export const getIpfsConfig = () => {
  return getConfig().ipfs;
};

// Override configuration at runtime (useful for testing or dynamic updates)
export const overrideConfig = (path, value) => {
  const env = getEnvironment();
  const pathParts = path.split('.');
  
  let current = configData[env];
  for (let i = 0; i < pathParts.length - 1; i++) {
    current = current[pathParts[i]];
  }
  
  current[pathParts[pathParts.length - 1]] = value;
  return configData[env];
};" > src/config/configManager.js

  success "Config.json and configManager.js created successfully"
  echo "You can now start updating your application to use the new configuration system."
}

# Main deployment sequence
main() {
  clear
  echo -e "${BLUE}"
  echo "====================================================="
  echo "     Base Sepolia Deployment Script for AI Educator   "
  echo "====================================================="
  echo -e "${NC}"
  
  if [ "$AUTO_YES" = true ]; then
    echo "Running in non-interactive mode (-y flag detected)"
  fi
  
  echo "This script will guide you through the entire deployment process:"
  echo "  1. Check system requirements"
  echo "  2. Check environment configuration"
  echo "  3. Install dependencies"
  echo "  4. Compile contracts"
  echo "  5. Deploy contracts to Base Sepolia"
  echo "  6. Extract ABIs"
  echo "  7. Update frontend configuration"
  echo "  8. Setup Chainlink Functions"
  echo "  9. Test deployment"
  echo "  10. Verify contracts (optional)"
  echo "  11. Setup config.json (optional)"
  
  if [ "$AUTO_YES" = false ]; then
    read -p "Press Enter to start the deployment process..."
  else
    echo "Starting deployment process automatically..."
  fi
  
  # Run all steps in sequence
  check_requirements
  check_env_file
  install_dependencies
  compile_contracts
  deploy_contracts
  extract_abis
  update_frontend_config
  setup_chainlink
  test_deployment
  verify_contracts
  setup_config_json
  
  section "Deployment Complete"
  echo -e "${GREEN}✅ AI Educator platform has been successfully deployed to Base Sepolia!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Start your frontend application: npm start"
  echo "  2. Test the application with a wallet connected to Base Sepolia"
  echo "  3. Check the Chainlink Functions subscription on https://functions.chain.link/base-sepolia"
  echo ""
  echo "If you encounter any issues, refer to the CHAINLINK-DIAGNOSTICS.md file for troubleshooting."
}

# Execute main function
main 