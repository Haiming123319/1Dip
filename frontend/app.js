// DRManager Main frontend application file
// Fully integrated with backend API

// DRManager Main frontend application file
// Fully integrated with backend API

class DRManagerApp {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = '0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC';
        this.selectedFile = null;
        this.apiBase = 'http://localhost:3000'; // 根据你的后端端口调整
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
            
            console.log('✅ Contract loaded successfully');
        } catch (error) {
            console.error('❌ Contract loading failed:', error);
            this.showNotification('Contract loading failed', 'error');
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
            connectBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
            connectBtn.disabled = true;
        } else {
            statusDot.classList.remove('connected');
            walletStatus.textContent = 'Not Connected';
            connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect MetaMask';
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
            this.showNotification('File too large, max 100MB', 'error');
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
        if (!preview) return; // 如果元素不存在就跳过
        
        const icon = this.getFileIcon(file.type);
        
        const fileIcon = document.getElementById('fileIcon');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        
        if (fileIcon) fileIcon.className = `fas ${icon} file-icon`;
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        
        preview.style.display = 'block';
    }

    // 
    showFileForm() {
        const fileForm = document.getElementById('fileForm');
        if (fileForm) {
            fileForm.style.display = 'block';
            const titleInput = document.getElementById('titleInput');
            if (titleInput) {
                titleInput.value = this.selectedFile.name.split('.')[0];
            }
        }
    }

    async registerCopyright() {
        if (!this.account) {
            this.showNotification('Please connect wallet first', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showNotification('Please select a file first', 'error');
            return;
        }

        if (!this.contract) {
            this.showNotification('Contract not loaded', 'error');
            return;
        }

        const btn = document.getElementById('registerBtn');
        const originalHTML = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner"></div> Registering...';
            
            const title = document.getElementById('titleInput')?.value?.trim() || this.selectedFile.name;
            const description = document.getElementById('descInput')?.value?.trim() || '';
            const category = document.getElementById('categorySelect')?.value || 'other';
            const price = document.getElementById('priceInput')?.value || '0';
            
            if (!title) {
                throw new Error('Please enter a file title');
            }

            this.showProgress('Uploading to IPFS...', 20);
            const ipfsHash = await this.uploadFileToIPFS(this.selectedFile);
            

            this.showProgress('Generating file hash...', 40);
            const fileHash = await this.calculateFileHash(this.selectedFile);
            
            this.showProgress('Registering on blockchain...', 60);
            const tx = await this.contract.registerWork(fileHash, title, ipfsHash);
            
            this.showProgress('Waiting for transaction confirmation...', 80);
            const receipt = await tx.wait();

            this.showProgress('Saving registration info...', 90);
            await this.saveContentToBackend({
                userAddress: this.account,
                title,
                description,
                category,
                price,
                ipfsHash,
                fileHash,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            });
            
            this.showProgress('Registration complete!', 100);

            this.showNotification('Copyright registration successful!');
            
            // Reset form
            this.resetForm();
            await this.loadUserContent();
            await this.loadUserStats();
            
        } catch (error) {
            console.error('❌ Copyright registration failed:', error);
            this.showNotification(`Registration failed: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            this.hideProgress();
        }
    }

    // 新增: 计算文件哈希函数
    async calculateFileHash(file) {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
                throw new Error(errorData.error || 'IPFS upload failed');
            }
            
            const result = await response.json();
            console.log('✅ IPFS upload successful:', result.ipfsHash);
            
            return result.ipfsHash;
            
        } catch (error) {
            console.error('❌ IPFS upload failed:', error);
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
                throw new Error(errorData.error || 'Backend save failed');
            }
            
            const result = await response.json();
            console.log('✅ Content saved to backend');
            
            return result;
            
        } catch (error) {
            console.error('❌ Backend save failed:', error);
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
                console.error('Transaction recording failed');
                return;
            }
            
            console.log('✅ Transaction recorded');
            
        } catch (error) {
            console.error('❌ Transaction recording failed:', error);
            // 不抛出错误，因为这不是关键功能
        }
    }

    // 
    async loadUserContent() {
        if (!this.account) return;
        
        try {
            const response = await fetch(`${this.apiBase}/api/content/user/${this.account}`);
            
            if (!response.ok) {
                throw new Error('Failed to load user content');
            }
            
            const result = await response.json();
            this.displayUserContent(result.contents || []);
            
        } catch (error) {
            console.error('❌ Failed to load user content:', error);
        }
    }

    // 
    displayUserContent(contents) {
        const container = document.getElementById('myContent');
        if (!container) return;
        
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
                            <i class="fas fa-external-link-alt"></i> View
                        </button>
                        <button class="btn" onclick="app.copyHash('${content.ipfsHash}')" style="padding: 8px 12px; font-size: 0.9em;">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                <div style="font-size: 0.8em; color: #9ca3af; margin-top: 10px;">
                    Registered: ${new Date(content.timestamp).toLocaleString()}
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
                const gasPriceEl = document.getElementById('gasPrice');
                if (gasPriceEl) {
                    gasPriceEl.textContent = `${parseFloat(gasPriceGwei).toFixed(1)} Gwei`;
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to load stats:', error);
        }
    }

    // 
    updateStats(stats) {
        const elements = {
            totalFiles: document.getElementById('totalFiles'),
            totalEarnings: document.getElementById('totalEarnings'),
            activeLicenses: document.getElementById('activeLicenses')
        };
        
        if (elements.totalFiles) elements.totalFiles.textContent = stats.totalFiles || '0';
        if (elements.totalEarnings) elements.totalEarnings.textContent = `${stats.totalEarnings || '0'} ETH`;
        if (elements.activeLicenses) elements.activeLicenses.textContent = stats.activeLicenses || '0';
    }

    showProgress(message, percent) {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressFill');
        const label = document.getElementById('progressLabel');
        const percentEl = document.getElementById('progressPercent');
        
        if (container) container.style.display = 'block';
        if (fill) fill.style.width = `${percent}%`;
        if (label) label.textContent = message;
        if (percentEl) percentEl.textContent = `${percent}%`;
    }

    // 
    hideProgress() {
        const container = document.getElementById('progressContainer');
        if (container) container.style.display = 'none';
    }

    // Reset form
    resetForm() {
        const elements = {
            fileInput: document.getElementById('fileInput'),
            fileForm: document.getElementById('fileForm'),
            filePreview: document.getElementById('filePreview'),
            titleInput: document.getElementById('titleInput'),
            descInput: document.getElementById('descInput'),
            priceInput: document.getElementById('priceInput')
        };
        
        if (elements.fileInput) elements.fileInput.value = '';
        if (elements.fileForm) elements.fileForm.style.display = 'none';
        if (elements.filePreview) elements.filePreview.style.display = 'none';
        if (elements.titleInput) elements.titleInput.value = '';
        if (elements.descInput) elements.descInput.value = '';
        if (elements.priceInput) elements.priceInput.value = '';
        
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
            this.showNotification('IPFS hash copied to clipboard');
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

 
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        const icon = document.getElementById('notificationIcon');
        
        if (!notification || !text || !icon) {
            console.log(`${type.toUpperCase()}: ${message}`);
            if (type === 'error') {
                alert(`Error: ${message}`);
            }
            return;
        }
        
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

