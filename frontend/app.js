// DRManager Main frontend application file
// Fully integrated with backend API

class DRManagerApp {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = '0x1fE38AFc5B06e147dCb0e2eF46FC7ee27bfd278f';
        this.selectedFile = null;
        this.apiBase = ''; // Base URL for backend API ()
    }

    // Initialize application
    async init() {
        console.log('🚀 Initializing DRManager...');
        
        this.setupEventListeners();
        await this.checkWalletConnection();
        await this.loadUserStats();
        
        console.log('✅ Application initialized successfully');
    }

    // Set up event listeners
    setupEventListeners() {
        // Wallet connection
        document.getElementById('connectBtn').onclick = () => this.connectWallet();
        
        // File upload
        document.getElementById('uploadZone').onclick = () => {
            document.getElementById('fileInput').click();
        };
        
        document.getElementById('fileInput').onchange = (e) => {
            this.handleFileSelect(e.target.files);
        };
        
        // Copyright registration
        document.getElementById('registerBtn').onclick = () => this.registerCopyright();
        
        // 
        this.setupDragAndDrop();
        
        //  MetaMask 
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.handleDisconnect();
                } else {
                    this.connectWallet();
                }
            });
            
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }

    // Set up drag-and-drop upload
    setupDragAndDrop() {
        const zone = document.getElementById('uploadZone');
        
        zone.ondragover = (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        };
        
        zone.ondragleave = () => {
            zone.classList.remove('dragover');
        };
        
        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        };
    }

    // Wallet connection
    async checkWalletConnection() {
        if (typeof window.ethereum === 'undefined') {
            this.showNotification('Please install MetaMask wallet', 'error');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                await this.connectWallet();
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
        }
    }

    // 
    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.account = accounts[0];
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // 
            await this.loadContract();

            // UI
            this.updateWalletUI(true);
            
            // 
            await this.loadUserContent();
            await this.loadUserStats();

            this.showNotification('Wallet connection！');
            
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showNotification('Wallet connection failed', 'error');
        }
    }

    // 
    handleDisconnect() {
        this.account = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        
        this.updateWalletUI(false);
        this.showNotification('');
    }

    // 
    async loadContract() {
        try {
            const response = await fetch('./contract.json');
            const contractData = await response.json();
            
            this.contract = new ethers.Contract(
                this.contractAddress,
                contractData.abi,
                this.signer
            );
            
            console.log('✅ ');
        } catch (error) {
            console.error('❌ :', error);
            this.showNotification('', 'error');
        }
    }

    // Update wallet UI status
    updateWalletUI(connected) {
        const statusDot = document.getElementById('statusDot');
        const walletStatus = document.getElementById('walletStatus');
        const connectBtn = document.getElementById('connectBtn');
        
        if (connected && this.account) {
            statusDot.classList.add('connected');
            walletStatus.textContent = `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
            connectBtn.innerHTML = '<i class="fas fa-check"></i> ';
            connectBtn.disabled = true;
        } else {
            statusDot.classList.remove('connected');
            walletStatus.textContent = '';
            connectBtn.innerHTML = '<i class="fas fa-wallet"></i>  MetaMask';
            connectBtn.disabled = false;
        }
    }

    // 
    handleFileSelect(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        if (!this.validateFile(file)) return;
        
        this.selectedFile = file;
        this.showFilePreview(file);
        this.showFileForm();
    }

    // 
    validateFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = ['image/', 'application/', 'text/', 'audio/', 'video/'];
        
        if (file.size > maxSize) {
            this.showNotification('， 100MB', 'error');
            return false;
        }
        
        if (!allowedTypes.some(type => file.type.startsWith(type))) {
            this.showNotification('Unsupported file type', 'error');
            return false;
        }
        
        return true;
    }

    // 
    showFilePreview(file) {
        const preview = document.getElementById('filePreview');
        const icon = this.getFileIcon(file.type);
        
        document.getElementById('fileIcon').className = `fas ${icon} file-icon`;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        
        preview.style.display = 'block';
    }

    // 
    showFileForm() {
        document.getElementById('fileForm').style.display = 'block';
        document.getElementById('titleInput').value = this.selectedFile.name.split('.')[0];
    }

    //  ()
    async registerCopyright() {
        if (!this.account) {
            this.showNotification('', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showNotification('', 'error');
            return;
        }

        if (!this.contract) {
            this.showNotification('', 'error');
            return;
        }

        const btn = document.getElementById('registerBtn');
        const originalHTML = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner"></div> ...';
            
            // 
            const title = document.getElementById('titleInput').value.trim();
            const description = document.getElementById('descInput').value.trim();
            const category = document.getElementById('categorySelect').value;
            const price = document.getElementById('priceInput').value || '0';
            
            if (!title) {
                throw new Error('Please enter a file title');
            }

            // 1:  IPFS
            this.showProgress(' IPFS...', 20);
            const ipfsHash = await this.uploadFileToIPFS(this.selectedFile);
            
            // 2: 
            this.showProgress('...', 60);
            const priceInWei = ethers.utils.parseEther(price);
            
            const tx = await this.contract.registerContent(ipfsHash, title, priceInWei);
            
            this.showProgress('...', 80);
            const receipt = await tx.wait();
            
            // 3: 
            this.showProgress('...', 90);
            await this.saveContentToBackend({
                userAddress: this.account,
                title,
                description,
                category,
                price,
                ipfsHash,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            });
            
            this.showProgress('！', 100);
            
            // 
            await this.recordTransaction({
                type: 'register',
                userAddress: this.account,
                contentId: ipfsHash, //  IPFS hash  ID
                txHash: receipt.transactionHash,
                amount: '0', // 
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            });

            this.showNotification('Copyright registration！');
            
            // Reset form
            this.resetForm();
            await this.loadUserContent();
            await this.loadUserStats();
            
        } catch (error) {
            console.error('❌ Copyright registration:', error);
            this.showNotification(`: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            this.hideProgress();
        }
    }

    //  IPFS ( API)
    async uploadFileToIPFS(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.apiBase}/api/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'IPFS ');
            }
            
            const result = await response.json();
            console.log('✅ IPFS :', result.ipfsHash);
            
            return result.ipfsHash;
            
        } catch (error) {
            console.error('❌ IPFS :', error);
            throw error;
        }
    }

    // 
    async saveContentToBackend(contentData) {
        try {
            const response = await fetch(`${this.apiBase}/api/content/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contentData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '');
            }
            
            const result = await response.json();
            console.log('✅ Content saved to backend');
            
            return result;
            
        } catch (error) {
            console.error('❌ :', error);
            throw error;
        }
    }

    // 
    async recordTransaction(transactionData) {
        try {
            const response = await fetch(`${this.apiBase}/api/transaction/record`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });
            
            if (!response.ok) {
                console.error('，');
                return;
            }
            
            console.log('✅ ');
            
        } catch (error) {
            console.error('❌ :', error);
            // ，
        }
    }

    // 
    async loadUserContent() {
        if (!this.account) return;
        
        try {
            const response = await fetch(`${this.apiBase}/api/content/user/${this.account}`);
            
            if (!response.ok) {
                throw new Error('');
            }
            
            const result = await response.json();
            this.displayUserContent(result.contents || []);
            
        } catch (error) {
            console.error('❌ :', error);
        }
    }

    // 
    displayUserContent(contents) {
        const container = document.getElementById('myContent');
        
        if (contents.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-inbox" style="font-size: 3em; margin-bottom: 20px; display: block;"></i>
                    <p>No content registered yet</p>
                    <p style="font-size: 0.9em; margin-top: 10px;">Upload your first file to start protecting your copyright!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = contents.map(content => `
            <div class="content-item">
                <div class="content-title">
                    <i class="fas ${this.getFileIcon('')}"></i>
                    ${content.title}
                </div>
                <div style="color: #6b7280; font-size: 0.9em; margin: 10px 0;">
                    ${content.description || 'No description'}
                </div>
                <div class="content-hash">
                    IPFS: ${content.ipfsHash.slice(0, 10)}...${content.ipfsHash.slice(-8)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span style="font-weight: 600; color: #667eea;">
                        ${content.price || '0'} ETH
                    </span>
                    <div class="content-actions">
                        <button class="btn" onclick="app.viewOnIPFS('${content.ipfsHash}')" style="padding: 8px 12px; font-size: 0.9em;">
                            <i class="fas fa-external-link-alt"></i> 
                        </button>
                        <button class="btn" onclick="app.copyHash('${content.ipfsHash}')" style="padding: 8px 12px; font-size: 0.9em;">
                            <i class="fas fa-copy"></i> 
                        </button>
                    </div>
                </div>
                <div style="font-size: 0.8em; color: #9ca3af; margin-top: 10px;">
                    : ${new Date(content.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    // Load user statistics
    async loadUserStats() {
        if (!this.account) {
            this.updateStats({
                totalFiles: '0',
                totalEarnings: '0',
                activeLicenses: '0',
                gasPrice: '- Gwei'
            });
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/api/stats/${this.account}`);
            
            if (response.ok) {
                const result = await response.json();
                this.updateStats(result.stats);
            }
            
            //  Gas 
            if (this.provider) {
                const gasPrice = await this.provider.getGasPrice();
                const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
                document.getElementById('gasPrice').textContent = `${parseFloat(gasPriceGwei).toFixed(1)} Gwei`;
            }
            
        } catch (error) {
            console.error('❌ :', error);
        }
    }

    // 
    updateStats(stats) {
        document.getElementById('totalFiles').textContent = stats.totalFiles || '0';
        document.getElementById('totalEarnings').textContent = `${stats.totalEarnings || '0'} ETH`;
        document.getElementById('activeLicenses').textContent = stats.activeLicenses || '0';
    }

    // Show progress
    showProgress(message, percent) {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressFill');
        const label = document.getElementById('progressLabel');
        const percentEl = document.getElementById('progressPercent');
        
        container.style.display = 'block';
        fill.style.width = `${percent}%`;
        label.textContent = message;
        percentEl.textContent = `${percent}%`;
    }

    // 
    hideProgress() {
        document.getElementById('progressContainer').style.display = 'none';
    }

    // Reset form
    resetForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('fileForm').style.display = 'none';
        document.getElementById('filePreview').style.display = 'none';
        document.getElementById('titleInput').value = '';
        document.getElementById('descInput').value = '';
        document.getElementById('priceInput').value = '';
        this.selectedFile = null;
    }

    //  IPFS 
    viewOnIPFS(hash) {
        const gatewayUrl = `https://ipfs.io/ipfs/${hash}`;
        window.open(gatewayUrl, '_blank');
    }

    //  IPFS 
    copyHash(hash) {
        navigator.clipboard.writeText(hash).then(() => {
            this.showNotification('IPFS ');
        });
    }

    // Get file icon
    getFileIcon(type) {
        if (type.startsWith('image/')) return 'fa-image';
        if (type.startsWith('video/')) return 'fa-video';
        if (type.startsWith('audio/')) return 'fa-music';
        if (type.includes('pdf')) return 'fa-file-pdf';
        if (type.includes('document') || type.includes('word')) return 'fa-file-word';
        return 'fa-file';
    }

    // 
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        const icon = document.getElementById('notificationIcon');
        
        // 
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            notification.classList.add('error');
        } else {
            icon.className = 'fas fa-check-circle';
            notification.classList.remove('error');
        }
        
        text.textContent = message;
        notification.classList.add('show');
        
        // 3
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 
const app = new DRManagerApp();

// 
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});


// let contract;
// let signer;

// async function loadContract() {
//     if (typeof window.ethereum === 'undefined') {
//         alert("MetaMask not detected. Please install MetaMask.");
//         return;
//     }

//     try {
//         console.log("Requesting MetaMask connection...");
//         const provider = new ethers.providers.Web3Provider(window.ethereum);
//         await provider.send("eth_requestAccounts", []);
//         signer = provider.getSigner();

//         console.log("Connected account:", await signer.getAddress());

//         const response = await fetch('contract.json');
//         const contractData = await response.json();
//         console.log("Contract JSON loaded:", contractData);

//         const contractAddress = "0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC"; 
//         const contractABI = contractData.abi;
//         contract = new ethers.Contract(contractAddress, contractABI, signer);

//         console.log("Contract initialized:", contract);
//     } catch (err) {
//         console.error("MetaMask connection failed:", err);
//         alert("MetaMask connection failed: " + err.message);
//     }
// }


// async function fileToHash(file) {
//     const buffer = await file.arrayBuffer();
//     const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
//     return '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
// }

// async function registerWork() {
//     const file = document.getElementById("fileInput").files[0];
//     const title = document.getElementById("titleInput").value;
//     if (!file || !title) return alert("Missing inputs");
//     const hash = await fileToHash(file);
//     await loadContract();
//     const tx = await contract.registerWork(hash, title, "placeholderCID");
//     await tx.wait();
//     document.getElementById("status").innerText = "Registered: " + hash;
// }

// async function createLicense() {
//     const file = document.getElementById("fileInput2").files[0];
//     const price = document.getElementById("priceInput").value;
//     const hash = await fileToHash(file);
//     const priceWei = ethers.utils.parseEther(price);
//     await loadContract();
//     const tx = await contract.createLicense(hash, priceWei, "General Use", "Global", 365 * 24 * 60 * 60);
//     await tx.wait();
//     document.getElementById("status").innerText = "License created: " + hash;
// }

// async function purchaseLicense() {
//     const file = document.getElementById("fileInput3").files[0];
//     const hash = await fileToHash(file);
//     await loadContract();
//     const lic = await contract.getLicense(hash);
//     const tx = await contract.purchaseLicense(hash, { value: lic.price });
//     await tx.wait();
//     document.getElementById("status").innerText = "License purchased: " + hash;
// }

// window.addEventListener("load", async () => {
//     await loadContract();
// });

