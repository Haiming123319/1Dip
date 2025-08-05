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

DEPLOYMENT INSTRUCTIONS

Environment Configuration:
1. Create .env file in backend directory
2. Configure the following variables:
       PRIVATE_KEY=dc4422202fa3556dc8720c0a34751e9ff657cdbb695a507d8d22b3bbf10f8441
       RPC_URL=https://sepolia.infura.io/v3/4f596755824a4a8f8787971688abab9f
       ETHERSCAN_API_KEY=DPMAW4UVUJYWZ72AXWAASQCQTTPVCPC6C6
       NFT_STORAGE_TOKEN=38517189.13cdcdcb69da54d7aace95b26394c2c54
       CONTRACT_ADDRESS=0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC
       WEB3_STORAGE_EMAIL=weiqingzuo@163.com
       SPACE_DID=did:key:z6Mkkjd65KSLqaceC9VASqy8JN9sX3r1ZKMJLoGSg2Y1TQbj
       PORT=3000

Structure:

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


Backend Setup:
1. Navigate to backend directory
2. Execute: npm install
3. Execute: npm start
4. Oracle service will be available on configured port

Frontend Setup:
1. Serve frontend directory using any HTTP server
2. Ensure MetaMask browser extension is installed
3. Connect to Sepolia testnet
4. Access application through web browser

Smart Contract Deployment:
1. Compile contracts: npx hardhat compile
2. Deploy to Sepolia: npx hardhat ignition deploy ./ignition/modules/Lock.js
3. Update contract addresses in frontend configuration

CONTRACT ADDRESSES
- DRManager: 0x1fE38AFc5B06e147dCb0e2eF46FC7ee27bfd278f
- ContentVerification: 0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC
- Deployment : 0x40c11e0c63ce00b49b12f77b27a90b1d502b0bafa1c5de2b33f628d5523df254
- ContentVerification : 0x5FbDB2315678afecb367f032d93F642f64180aa3


SECURITY CONSIDERATIONS
- Conduct thorough security audits before production deployment
- Implement proper access controls and permission management
- Ensure secure handling of private keys and sensitive data
- Regular monitoring of smart contract interactions

LICENSE
This project is licensed under the MIT License.
