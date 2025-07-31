This project implements a blockchain-based copyright registration and licensing system.

Components:
- DRManager.sol: Smart contract for registration, licensing, and payment
- backend/: Node.js backend to upload files to IPFS and act as oracle
- frontend/: HTML/JS frontend that connects via MetaMask

Fill in .env for backend with your private key, RPC URL, and Web3Storage token.
Run "npm install" and "npm start" in backend/ to launch the oracle service.
