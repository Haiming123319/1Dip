DRManager: Decentralized Digital Rights Management System

This project implements a comprehensive blockchain-based digital rights management system for copyright registration, verification, and licensing.

SYSTEM ARCHITECTURE

Smart Contracts:
- DRManager.sol: Core rights management contract for registration, licensing, and royalty distribution
- ContentVerification.sol: Content verification contract with Oracle network integration
- DRManager_Public.sol: Public interface contract for external interactions

Backend Services:
- Node.js/Express.js API server for file upload and IPFS integration
- SQLite database for local data management
- Oracle service for content verification and dispute resolution
- Web3.Storage integration for decentralized file storage

Frontend Application:
- HTML5/CSS3/JavaScript interface with responsive design
- MetaMask wallet integration for Web3 connectivity
- Oracle dashboard for validator management
- Content verification and licensing interface

REQUIRED LIBRARIES AND DEPENDENCIES

Root Project Dependencies:
- hardhat: ^2.17.0 (Smart contract development framework)
- @nomicfoundation/hardhat-toolbox: ^2.0.0 (Hardhat development tools)
- dotenv: ^17.2.0 (Environment variable management)
- ethers: ^5.8.0 (Ethereum library for JavaScript)

Backend Dependencies:
- express: ^4.21.2 (Web application framework)
- cors: ^2.8.5 (Cross-origin resource sharing)
- multer: ^2.0.2 (File upload middleware)
- sqlite3: ^5.1.7 (SQLite database driver)
- ethers: ^5.8.0 (Ethereum library)
- axios: ^1.11.0 (HTTP client)
- form-data: ^4.0.4 (Form data handling)
- @web3-storage/w3up-client: ^17.3.0 (Web3.Storage client)
- nft.storage: ^7.2.0 (NFT.Storage integration)
- web3.storage: ^4.5.5 (Web3.Storage API)
- files-from-path: ^1.1.4 (File path utilities)
- nodemon: ^3.0.1 (Development server)

Frontend Dependencies:
- ethers.js (via CDN): Web3 integration
- MetaMask browser extension: Wallet connectivity

SETUP INSTRUCTIONS

Prerequisites:
- Node.js >= 16.0.0
- npm >= 8.0.0
- Git
- MetaMask browser extension
- Ethereum testnet (Sepolia) account with test ETH

Installation Steps:

1. Clone Repository:
   ```bash
   git clone <repository-url>
   cd DRManager
   ```

2. Install Root Dependencies:
   ```bash
   npm install
   ```

3. Install Backend Dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. Environment Configuration:
   Create .env file in backend directory with the following variables:
   ```
   PRIVATE_KEY=dc4422202fa3556dc8720c0a34751e9ff657cdbb695a507d8d22b3bbf10f8441
   RPC_URL=https://sepolia.infura.io/v3/4f596755824a4a8f8787971688abab9f
   ETHERSCAN_API_KEY=DPMAW4UVUJYWZ72AXWAASQCQTTPVCPC6C6
   NFT_STORAGE_TOKEN=38517189.13cdcdcb69da54d7aace95b26394c2c54
   CONTRACT_ADDRESS=0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC
   WEB3_STORAGE_EMAIL=weiqingzuo@163.com
   SPACE_DID=did:key:z6Mkkjd65KSLqaceC9VASqy8JN9sX3r1ZKMJLoGSg2Y1TQbj
   PORT=3000
   ```

5. Smart Contract Deployment:
   ```bash
   # Compile contracts
   npx hardhat compile
   
   # Deploy to Sepolia testnet
   npx hardhat ignition deploy ./ignition/modules/Lock.js
   ```

6. Start Backend Service:
   ```bash
   cd backend
   npm start
   # Oracle service will be available on port 3000
   ```

7. Launch Frontend:
   ```bash
   # In project root directory
   # Option 1: Using Python HTTP server
   python -m http.server 8000
   
   # Option 2: Using Node.js HTTP server
   npx http-server frontend -p 8000
   
   # Option 3: Using any other HTTP server
   # Serve the frontend/ directory
   ```

8. Access Application:
   - Open web browser
   - Navigate to http://localhost:8000
   - Ensure MetaMask is installed and connected to Sepolia testnet

PROJECT STRUCTURE

DRManager/
├── contracts/                 # Smart contracts
│   ├── DRManager.sol         # Core rights management contract
│   ├── ContentVerification.sol # Content verification contract
│   └── DRManager_Public.sol  # Public interface contract
├── frontend/                 # Frontend application
│   ├── index.html           # Main interface
│   ├── app.js              # Main logic
│   ├── oracle-dashboard.html # Oracle dashboard
│   └── contract.json       # Contract ABI
├── backend/                 # Backend services
│   ├── index.js            # Main server
│   ├── database.js         # Database operations
│   ├── oracle.js           # Oracle service
│   └── upload.js           # File upload
├── scripts/                 # Deployment scripts
├── test/                   # Test files
├── ignition/               # Hardhat Ignition deployment
└── hardhat.config.js       # Hardhat configuration

CONTRACT ADDRESSES

- ContentVerification1: 0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC
- ContentVerification2: 0x5FbDB2315678afecb367f032d93F642f64180aa3

DEVELOPMENT COMMANDS

Smart Contract Development:
```bash
npx hardhat compile          # Compile contracts
npx hardhat test            # Run tests
npx hardhat node           # Start local blockchain
npx hardhat console        # Interactive console
```

Backend Development:
```bash
cd backend
npm run dev               # Development mode with auto-reload
npm start                 # Production mode
npm test                  # Run backend tests
```

Frontend Development:
- Modify files in frontend/ directory
- Use browser developer tools for debugging
- Ensure MetaMask connection is functional

TROUBLESHOOTING

Common Issues:
1. MetaMask not connected: Ensure MetaMask is installed and connected to Sepolia
2. Contract deployment failed: Check RPC URL and private key configuration
3. Backend connection error: Verify PORT configuration and firewall settings
4. File upload issues: Check Web3.Storage token and network connectivity

SECURITY CONSIDERATIONS
- Conduct thorough security audits before production deployment
- Implement proper access controls and permission management
- Ensure secure handling of private keys and sensitive data
- Regular monitoring of smart contract interactions
- Never commit private keys or sensitive tokens to version control

LICENSE
This project is licensed under the MIT License.
