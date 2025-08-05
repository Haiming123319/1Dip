# DRManager - Decentralized Digital Rights Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org/)

## Abstract

DRManager is a blockchain-based decentralized digital rights management system designed to provide creators with secure, transparent, and immutable digital content copyright protection solutions. The system integrates smart contracts, IPFS storage, Oracle verification mechanisms, and Web3 technologies to provide a complete ecosystem for digital content registration, verification, licensing, and trading.

## Core Features

### Digital Rights Registration
- Blockchain-based copyright registration ensuring immutability
- IPFS distributed storage support
- Content hash verification mechanisms
- Timestamp and author identity authentication

### Content Verification System
- Multi-dimensional content authenticity verification
- Oracle network verification mechanisms
- Dispute resolution and evidence submission
- Verification scoring system (0-100)

### Smart License Management
- Flexible license creation and configuration
- Regional and usage scope restrictions
- Automatic expiration mechanisms
- On-chain payment and royalty distribution

### Oracle Network
- Decentralized verification network
- Multi-validator consensus mechanisms
- Validator reputation systems
- Automatic reward distribution

## Technical Architecture

### Smart Contract Layer
- **DRManager.sol**: Core rights management contract
- **ContentVerification.sol**: Content verification contract
- **DRManager_Public.sol**: Public interface contract

### Backend Services
- **Express.js** API server
- **SQLite** database
- **IPFS/Web3.Storage** file storage
- **Ethers.js** blockchain interaction

### Frontend Interface
- **HTML5/CSS3/JavaScript** native frontend
- **Ethers.js** Web3 integration
- **MetaMask** wallet connection
- Responsive design

## Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- MetaMask browser extension
- Ethereum testnet (Sepolia) account

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd DRManager
```

2. **Install Dependencies**
```bash
# Install Hardhat project dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

3. **Environment Configuration**
```bash
# Create environment variables file
cp .env.example .env

# Configure the following environment variables
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

4. **Deploy Smart Contracts**
```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

5. **Start Backend Service**
```bash
cd backend
npm start
```

6. **Launch Frontend**
```bash
# In project root directory
# Use any HTTP server to serve the frontend directory
python -m http.server 8000
# Or use Node.js
npx http-server frontend -p 8000
```

## Project Structure

```
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
```

## Usage Guide

### Creator Workflow
1. Connect MetaMask wallet
2. Upload digital content files
3. Register copyright information
4. Create licenses
5. Monitor royalty income

### Purchaser Workflow
1. Browse available licenses
2. Select appropriate content
3. Pay license fees
4. Obtain usage permissions

### Oracle Validator Workflow
1. Apply to become a validator
2. Receive verification tasks
3. Submit verification results
4. Receive validation rewards

## Development Guide

### Smart Contract Development
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Local network testing
npx hardhat node
```

### Backend API Development
```bash
cd backend
npm run dev  # Development mode
npm start    # Production mode
```

### Frontend Development
- Modify files in the `frontend/` directory
- Test with modern browsers
- Ensure MetaMask connection is functional

## Contract Addresses

- **DRManager**: `0x1fE38AFc5B06e147dCb0e2eF46FC7ee27bfd278f`
- **ContentVerification**: `0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC`

## Security Features

- Smart contract security auditing
- Multi-signature mechanisms
- Time-lock functionality
- Emergency pause mechanisms
- Permission management systems

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Project Homepage: [GitHub Repository]
- Issue Reporting: [Issues]
- Email: [your-email@example.com]

## Acknowledgments

We thank all developers and community members who have contributed to this project.

---

**Note**: This is a demonstration project. Please conduct thorough security audits and testing before using in production environments.
