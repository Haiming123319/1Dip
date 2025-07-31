// DRManager 前端应用主文件
// 与后端 API 完全对接

class DRManagerApp {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = '0x1fE38AFc5B06e147dCb0e2eF46FC7ee27bfd278f';
        this.selectedFile = null;
        this.apiBase = ''; // 后端API基础地址 (同域名)
    }

    // 初始化应用
    async init() {
        console.log('🚀 初始化 DRManager...');
        
        this.setupEventListeners();
        await this.checkWalletConnection();
        await this.loadUserStats();
        
        console.log('✅ 应用初始化完成');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 钱包连接
        document.getElementById('connectBtn').onclick = () => this.connectWallet();
        
        // 文件上传
        document.getElementById('uploadZone').onclick = () => {
            document.getElementById('fileInput').click();
        };
        
        document.getElementById('fileInput').onchange = (e) => {
            this.handleFileSelect(e.target.files);
        };
        
        // 版权注册
        document.getElementById('registerBtn').onclick = () => this.registerCopyright();
        
        // 拖拽上传
        this.setupDragAndDrop();
        
        // 监听 MetaMask 事件
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

    // 设置拖拽上传
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

    // 检查钱包连接
    async checkWalletConnection() {
        if (typeof window.ethereum === 'undefined') {
            this.showNotification('请安装 MetaMask 钱包', 'error');
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
            console.error('检查钱包连接失败:', error);
        }
    }

    // 连接钱包
    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.account = accounts[0];
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // 加载合约
            await this.loadContract();

            // 更新UI
            this.updateWalletUI(true);
            
            // 加载用户数据
            await this.loadUserContent();
            await this.loadUserStats();

            this.showNotification('钱包连接成功！');
            
        } catch (error) {
            console.error('钱包连接失败:', error);
            this.showNotification('钱包连接失败', 'error');
        }
    }

    // 处理断开连接
    handleDisconnect() {
        this.account = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        
        this.updateWalletUI(false);
        this.showNotification('钱包已断开连接');
    }

    // 加载智能合约
    async loadContract() {
        try {
            const response = await fetch('./contract.json');
            const contractData = await response.json();
            
            this.contract = new ethers.Contract(
                this.contractAddress,
                contractData.abi,
                this.signer
            );
            
            console.log('✅ 智能合约加载成功');
        } catch (error) {
            console.error('❌ 智能合约加载失败:', error);
            this.showNotification('合约加载失败', 'error');
        }
    }

    // 更新钱包UI状态
    updateWalletUI(connected) {
        const statusDot = document.getElementById('statusDot');
        const walletStatus = document.getElementById('walletStatus');
        const connectBtn = document.getElementById('connectBtn');
        
        if (connected && this.account) {
            statusDot.classList.add('connected');
            walletStatus.textContent = `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
            connectBtn.innerHTML = '<i class="fas fa-check"></i> 已连接';
            connectBtn.disabled = true;
        } else {
            statusDot.classList.remove('connected');
            walletStatus.textContent = '未连接钱包';
            connectBtn.innerHTML = '<i class="fas fa-wallet"></i> 连接 MetaMask';
            connectBtn.disabled = false;
        }
    }

    // 处理文件选择
    handleFileSelect(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        if (!this.validateFile(file)) return;
        
        this.selectedFile = file;
        this.showFilePreview(file);
        this.showFileForm();
    }

    // 文件验证
    validateFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = ['image/', 'application/', 'text/', 'audio/', 'video/'];
        
        if (file.size > maxSize) {
            this.showNotification('文件过大，最大支持 100MB', 'error');
            return false;
        }
        
        if (!allowedTypes.some(type => file.type.startsWith(type))) {
            this.showNotification('不支持的文件类型', 'error');
            return false;
        }
        
        return true;
    }

    // 显示文件预览
    showFilePreview(file) {
        const preview = document.getElementById('filePreview');
        const icon = this.getFileIcon(file.type);
        
        document.getElementById('fileIcon').className = `fas ${icon} file-icon`;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        
        preview.style.display = 'block';
    }

    // 显示文件表单
    showFileForm() {
        document.getElementById('fileForm').style.display = 'block';
        document.getElementById('titleInput').value = this.selectedFile.name.split('.')[0];
    }

    // 注册版权 (核心功能)
    async registerCopyright() {
        if (!this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        if (!this.selectedFile) {
            this.showNotification('请先选择文件', 'error');
            return;
        }

        if (!this.contract) {
            this.showNotification('智能合约未加载', 'error');
            return;
        }

        const btn = document.getElementById('registerBtn');
        const originalHTML = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner"></div> 处理中...';
            
            // 获取表单数据
            const title = document.getElementById('titleInput').value.trim();
            const description = document.getElementById('descInput').value.trim();
            const category = document.getElementById('categorySelect').value;
            const price = document.getElementById('priceInput').value || '0';
            
            if (!title) {
                throw new Error('请输入文件标题');
            }

            // 步骤1: 上传文件到 IPFS
            this.showProgress('正在上传文件到 IPFS...', 20);
            const ipfsHash = await this.uploadFileToIPFS(this.selectedFile);
            
            // 步骤2: 调用智能合约注册版权
            this.showProgress('正在注册版权到区块链...', 60);
            const priceInWei = ethers.utils.parseEther(price);
            
            const tx = await this.contract.registerContent(ipfsHash, title, priceInWei);
            
            this.showProgress('等待区块链确认...', 80);
            const receipt = await tx.wait();
            
            // 步骤3: 保存到后端数据库
            this.showProgress('保存注册信息...', 90);
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
            
            this.showProgress('注册完成！', 100);
            
            // 记录交易
            await this.recordTransaction({
                type: 'register',
                userAddress: this.account,
                contentId: ipfsHash, // 临时使用 IPFS hash 作为 ID
                txHash: receipt.transactionHash,
                amount: '0', // 注册不涉及金额
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            });

            this.showNotification('版权注册成功！');
            
            // 重置表单并刷新数据
            this.resetForm();
            await this.loadUserContent();
            await this.loadUserStats();
            
        } catch (error) {
            console.error('❌ 版权注册失败:', error);
            this.showNotification(`注册失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            this.hideProgress();
        }
    }

    // 上传文件到 IPFS (调用后端 API)
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
                throw new Error(errorData.error || 'IPFS 上传失败');
            }
            
            const result = await response.json();
            console.log('✅ IPFS 上传成功:', result.ipfsHash);
            
            return result.ipfsHash;
            
        } catch (error) {
            console.error('❌ IPFS 上传失败:', error);
            throw error;
        }
    }

    // 保存内容信息到后端
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
                throw new Error(errorData.error || '保存内容失败');
            }
            
            const result = await response.json();
            console.log('✅ 内容信息已保存到后端');
            
            return result;
            
        } catch (error) {
            console.error('❌ 保存到后端失败:', error);
            throw error;
        }
    }

    // 记录交易信息
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
                console.error('记录交易失败，但不影响主流程');
                return;
            }
            
            console.log('✅ 交易记录已保存');
            
        } catch (error) {
            console.error('❌ 记录交易失败:', error);
            // 不抛出错误，因为这不是关键流程
        }
    }

    // 加载用户内容
    async loadUserContent() {
        if (!this.account) return;
        
        try {
            const response = await fetch(`${this.apiBase}/api/content/user/${this.account}`);
            
            if (!response.ok) {
                throw new Error('获取用户内容失败');
            }
            
            const result = await response.json();
            this.displayUserContent(result.contents || []);
            
        } catch (error) {
            console.error('❌ 加载用户内容失败:', error);
        }
    }

    // 显示用户内容
    displayUserContent(contents) {
        const container = document.getElementById('myContent');
        
        if (contents.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-inbox" style="font-size: 3em; margin-bottom: 20px; display: block;"></i>
                    <p>还没有注册任何内容</p>
                    <p style="font-size: 0.9em; margin-top: 10px;">上传您的第一个文件开始保护版权吧！</p>
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
                    ${content.description || '无描述'}
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
                            <i class="fas fa-external-link-alt"></i> 查看
                        </button>
                        <button class="btn" onclick="app.copyHash('${content.ipfsHash}')" style="padding: 8px 12px; font-size: 0.9em;">
                            <i class="fas fa-copy"></i> 复制
                        </button>
                    </div>
                </div>
                <div style="font-size: 0.8em; color: #9ca3af; margin-top: 10px;">
                    注册时间: ${new Date(content.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    // 加载用户统计数据
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
            
            // 获取当前 Gas 价格
            if (this.provider) {
                const gasPrice = await this.provider.getGasPrice();
                const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
                document.getElementById('gasPrice').textContent = `${parseFloat(gasPriceGwei).toFixed(1)} Gwei`;
            }
            
        } catch (error) {
            console.error('❌ 加载统计数据失败:', error);
        }
    }

    // 更新统计显示
    updateStats(stats) {
        document.getElementById('totalFiles').textContent = stats.totalFiles || '0';
        document.getElementById('totalEarnings').textContent = `${stats.totalEarnings || '0'} ETH`;
        document.getElementById('activeLicenses').textContent = stats.activeLicenses || '0';
    }

    // 显示进度
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

    // 隐藏进度
    hideProgress() {
        document.getElementById('progressContainer').style.display = 'none';
    }

    // 重置表单
    resetForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('fileForm').style.display = 'none';
        document.getElementById('filePreview').style.display = 'none';
        document.getElementById('titleInput').value = '';
        document.getElementById('descInput').value = '';
        document.getElementById('priceInput').value = '';
        this.selectedFile = null;
    }

    // 在 IPFS 网关查看文件
    viewOnIPFS(hash) {
        const gatewayUrl = `https://ipfs.io/ipfs/${hash}`;
        window.open(gatewayUrl, '_blank');
    }

    // 复制 IPFS 哈希
    copyHash(hash) {
        navigator.clipboard.writeText(hash).then(() => {
            this.showNotification('IPFS 哈希已复制到剪贴板');
        });
    }

    // 获取文件图标
    getFileIcon(type) {
        if (type.startsWith('image/')) return 'fa-image';
        if (type.startsWith('video/')) return 'fa-video';
        if (type.startsWith('audio/')) return 'fa-music';
        if (type.includes('pdf')) return 'fa-file-pdf';
        if (type.includes('document') || type.includes('word')) return 'fa-file-word';
        return 'fa-file';
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 显示通知
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        const icon = document.getElementById('notificationIcon');
        
        // 设置图标和样式
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            notification.classList.add('error');
        } else {
            icon.className = 'fas fa-check-circle';
            notification.classList.remove('error');
        }
        
        text.textContent = message;
        notification.classList.add('show');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 创建全局应用实例
const app = new DRManagerApp();

// 页面加载完成后初始化
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

