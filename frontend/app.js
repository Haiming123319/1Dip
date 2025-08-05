// DRManager Frontend Application - English Version

const API_BASE = 'http://localhost:3000';
let web3;
let contract;
let userAccount;
let currentUploadId = null;

// Contract ABI and Address (should be loaded from contract.json)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Wait for MetaMask injection
async function waitForMetaMask(timeout = 10000) {
    const start = Date.now();
    
    while (!window.ethereum) {
        if (Date.now() - start > timeout) {
            throw new Error('MetaMask not detected. Please install MetaMask browser extension.');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return window.ethereum;
}

// Connect to MetaMask wallet
async function connectWallet() {
    const statusDiv = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWallet');
    const addressInput = document.getElementById('walletAddress');
    
    try {
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;
        
        // Wait for MetaMask to be available
        await waitForMetaMask();
        
        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask.');
        }
        
        userAccount = accounts[0];
        addressInput.value = userAccount;
        
        // Initialize web3 and contract
        web3 = new Web3(window.ethereum);
        
        showStatus(statusDiv, 'success', `✅ Wallet connected: ${userAccount.substring(0,10)}...`);
        connectBtn.textContent = 'Connected';
        connectBtn.style.background = 'linear-gradient(135deg, #059669, #047857)';
        
        // Enable other functions
        enableUploadSection();
        loadUserStats();
        loadUserWorksForLicense();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        let errorMessage = 'Failed to connect to MetaMask';
        
        if (error.message.includes('MetaMask not detected')) {
            errorMessage = 'MetaMask not detected. Please install MetaMask browser extension and refresh the page.';
        } else if (error.message.includes('No accounts')) {
            errorMessage = 'No accounts found. Please unlock MetaMask and create an account.';
        } else if (error.code === 4001) {
            errorMessage = 'Connection rejected. Please approve the connection in MetaMask.';
        }
        
        showStatus(statusDiv, 'error', `❌ ${errorMessage}`);
        connectBtn.textContent = 'Connect MetaMask';
        connectBtn.disabled = false;
    }
}

// Check wallet connection status
async function checkWalletConnection() {
    try {
        await waitForMetaMask();
        
        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
            userAccount = accounts[0];
            document.getElementById('walletAddress').value = userAccount;
            document.getElementById('connectWallet').textContent = 'Connected';
            document.getElementById('connectWallet').style.background = 'linear-gradient(135deg, #059669, #047857)';
            enableUploadSection();
            loadUserStats();
            loadUserWorksForLicense();
        }
    } catch (error) {
        console.error('Check wallet connection error:', error);
    }
}

// Enable upload section
function enableUploadSection() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    fileInput.disabled = false;
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = `Upload: ${e.target.files[0].name}`;
        }
    });
}

// File upload to IPFS
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const statusDiv = document.getElementById('uploadStatus');
    const progressDiv = document.getElementById('uploadProgress');
    
    if (!fileInput.files[0]) {
        showStatus(statusDiv, 'error', '❌ Please select a file first');
        return;
    }
    
    const file = fileInput.files[0];
    
    // File size check (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
        showStatus(statusDiv, 'error', '❌ File size exceeds 100MB limit');
        return;
    }
    
    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        showProgress(progressDiv);
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUploadId = result.id;
            hideProgress(progressDiv);
            showStatus(statusDiv, 'success', `✅ File uploaded successfully! IPFS Hash: ${result.ipfsHash.substring(0,20)}...`);
            
            // Enable registration
            document.getElementById('registerBtn').disabled = false;
            
            // Auto-fill title if empty
            const titleInput = document.getElementById('contentTitle');
            if (!titleInput.value) {
                titleInput.value = file.name.split('.')[0]; // Remove extension
            }
            
        } else {
            throw new Error(result.error || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        hideProgress(progressDiv);
        showStatus(statusDiv, 'error', `❌ Upload failed: ${error.message}`);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload to IPFS';
    }
}

// Register content copyright
async function registerCopyright() {
    const titleInput = document.getElementById('contentTitle');
    const descriptionInput = document.getElementById('contentDescription');
    const categoryInput = document.getElementById('contentCategory');
    const registerBtn = document.getElementById('registerBtn');
    const statusDiv = document.getElementById('registerStatus');
    const progressDiv = document.getElementById('registerProgress');
    
    if (!currentUploadId) {
        showStatus(statusDiv, 'error', '❌ Please upload a file first');
        return;
    }
    
    if (!titleInput.value.trim()) {
        showStatus(statusDiv, 'error', '❌ Please enter a title');
        return;
    }
    
    if (!userAccount) {
        showStatus(statusDiv, 'error', '❌ Please connect wallet first');
        return;
    }
    
    try {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Registering...';
        showProgress(progressDiv);
        
        // Skip blockchain interaction for now (offline mode)
        // Generate offline transaction details
        const offlineTxHash = `offline_${Date.now()}`;
        const blockNumber = 0;
        
        // Register with backend
        const response = await fetch(`${API_BASE}/api/content/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userAddress: userAccount,
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                category: categoryInput.value,
                price: '0',
                uploadId: currentUploadId,
                txHash: offlineTxHash,
                blockNumber: blockNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideProgress(progressDiv);
            showStatus(statusDiv, 'success', `✅ Content registered successfully! ID: ${result.id}`);
            
            // Reset form
            titleInput.value = '';
            descriptionInput.value = '';
            categoryInput.selectedIndex = 0;
            currentUploadId = null;
            
            // Refresh stats and user works
            loadUserStats();
            loadUserWorksForLicense();
            
        } else {
            throw new Error(result.error || 'Registration failed');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        hideProgress(progressDiv);
        showStatus(statusDiv, 'error', `❌ Registration failed: ${error.message}`);
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Copyright';
    }
}

// Load user works for license creation
async function loadUserWorksForLicense() {
    if (!userAccount) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/content/user/${userAccount}`);
        const result = await response.json();
        
        const select = document.getElementById('myWorksSelect');
        select.innerHTML = '<option value="">Choose registered content...</option>';
        
        if (result.success && result.contents.length > 0) {
            result.contents.forEach(content => {
                const option = document.createElement('option');
                option.value = content.id;
                option.textContent = `${content.title} (${content.category})`;
                select.appendChild(option);
            });
            
            document.getElementById('createLicenseBtn').disabled = false;
        }
        
    } catch (error) {
        console.error('Failed to load user works:', error);
    }
}

// Create license
async function createLicense() {
    const contentSelect = document.getElementById('myWorksSelect');
    const priceInput = document.getElementById('licensePrice');
    const scopeInput = document.getElementById('usageScope');
    const regionInput = document.getElementById('region');
    const durationInput = document.getElementById('duration');
    const statusDiv = document.getElementById('createLicenseStatus');
    const progressDiv = document.getElementById('createLicenseProgress');
    
    if (!contentSelect.value) {
        showStatus(statusDiv, 'error', '❌ Please select content to license');
        return;
    }
    
    if (!priceInput.value || parseFloat(priceInput.value) <= 0) {
        showStatus(statusDiv, 'error', '❌ Please enter a valid price');
        return;
    }
    
    if (!scopeInput.value.trim()) {
        showStatus(statusDiv, 'error', '❌ Please enter usage scope');
        return;
    }
    
    if (!regionInput.value.trim()) {
        showStatus(statusDiv, 'error', '❌ Please enter region');
        return;
    }
    
    try {
        showProgress(progressDiv);
        showLicenseProgress();
        
        const response = await fetch(`${API_BASE}/api/license/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contentId: contentSelect.value,
                userAddress: userAccount,
                price: priceInput.value,
                usageScope: scopeInput.value.trim(),
                region: regionInput.value.trim() || 'Global',
                duration: parseInt(durationInput.value) || 365
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideProgress(progressDiv);
            hideLicenseProgress();
            showStatus(statusDiv, 'success', `✅ License created successfully! ID: ${result.id}`);
            resetLicenseForm();
            loadUserStats();
        } else {
            throw new Error(result.error || 'Failed to create license');
        }
        
    } catch (error) {
        console.error('Create license error:', error);
        hideProgress(progressDiv);
        hideLicenseProgress();
        showStatus(statusDiv, 'error', `❌ Failed to create license: ${error.message}`);
    }
}

// Search license (placeholder)
async function searchLicense() {
    const statusDiv = document.getElementById('buyLicenseStatus');
    showStatus(statusDiv, 'info', '🚧 Search functionality is under development');
}

// Load marketplace licenses
async function loadMarketplaceLicenses() {
    const statusDiv = document.getElementById('buyLicenseStatus');
    const progressDiv = document.getElementById('buyLicenseProgress');
    const resultsDiv = document.getElementById('licenseResults');
    
    try {
        showProgress(progressDiv);
        
        const response = await fetch(`${API_BASE}/api/license/marketplace`);
        const result = await response.json();
        
        hideProgress(progressDiv);
        
        if (result.success) {
            if (result.licenses.length === 0) {
                showStatus(statusDiv, 'info', 'ℹ️ No licenses available in marketplace yet');
                resultsDiv.innerHTML = '<p style="text-align: center; color: #6b7280;">No licenses found. Create the first one!</p>';
            } else {
                showStatus(statusDiv, 'success', `✅ Found ${result.licenses.length} licenses`);
                displayMarketplaceLicenses(result.licenses);
            }
        } else {
            throw new Error(result.error || 'Failed to load marketplace');
        }
        
    } catch (error) {
        console.error('Load marketplace error:', error);
        hideProgress(progressDiv);
        showStatus(statusDiv, 'error', `❌ Failed to load marketplace: ${error.message}`);
    }
}

// Display marketplace licenses
function displayMarketplaceLicenses(licenses) {
    const resultsDiv = document.getElementById('licenseResults');
    
    resultsDiv.innerHTML = licenses.map(license => `
        <div class="license-card">
            <div class="license-title">${license.title}</div>
            <div class="license-info">
                <strong>Price:</strong> ${license.price} ETH<br>
                <strong>Scope:</strong> ${license.usageScope}<br>
                <strong>Region:</strong> ${license.region}<br>
                <strong>Valid until:</strong> ${new Date(license.expiryDate).toLocaleDateString()}<br>
                <strong>Publisher:</strong> ${license.userAddress.substring(0,10)}...
            </div>
            <div class="license-actions">
                <button class="btn btn-secondary btn-small" onclick="window.open('https://ipfs.io/ipfs/${license.ipfsHash}', '_blank')">Preview Content</button>
                <button class="btn btn-success btn-small" onclick="purchaseLicense('${license.id}', '${license.price}')">Buy License</button>
            </div>
        </div>
    `).join('');
}

// Purchase license
async function purchaseLicense(licenseId, price) {
    const statusDiv = document.getElementById('buyLicenseStatus');
    
    if (!userAccount) {
        showStatus(statusDiv, 'error', '❌ Please connect wallet first');
        return;
    }
    
    if (!confirm(`Confirm purchase of license for ${price} ETH?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/license/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                licenseId: licenseId,
                buyerAddress: userAccount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus(statusDiv, 'success', `✅ License purchased successfully! Transaction ID: ${result.transactionId}`);
            loadUserStats();
            loadMarketplaceLicenses(); // Refresh marketplace
        } else {
            throw new Error(result.error || 'Purchase failed');
        }
        
    } catch (error) {
        console.error('Purchase license error:', error);
        showStatus(statusDiv, 'error', `❌ Purchase failed: ${error.message}`);
    }
}

// Load user statistics
async function loadUserStats() {
    if (!userAccount) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/stats/${userAccount}`);
        const result = await response.json();
        
        if (result.success && result.stats) {
            const stats = result.stats;
            const statsDiv = document.getElementById('userStats');
            
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.totalUploads || 0}</div>
                    <div class="stat-label">Files Uploaded</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.registeredContents || 0}</div>
                    <div class="stat-label">Content Registered</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.activeLicenses || 0}</div>
                    <div class="stat-label">Active Licenses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalEarnings || '0.000'}</div>
                    <div class="stat-label">Total Earnings (ETH)</div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

// Helper functions
function showStatus(element, type, message) {
    element.className = `status ${type}`;
    element.textContent = message;
    element.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function showProgress(element) {
    element.style.display = 'block';
}

function hideProgress(element) {
    element.style.display = 'none';
}

function showLicenseProgress() {
    const progressDiv = document.getElementById('createLicenseProgress');
    showProgress(progressDiv);
}

function hideLicenseProgress() {
    const progressDiv = document.getElementById('createLicenseProgress');
    hideProgress(progressDiv);
}

function resetLicenseForm() {
    document.getElementById('myWorksSelect').selectedIndex = 0;
    document.getElementById('licensePrice').value = '';
    document.getElementById('usageScope').value = '';
    document.getElementById('region').value = '';
    document.getElementById('duration').value = '';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check wallet connection on page load
    checkWalletConnection();
    
    // Wallet connection
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    
    // File upload
    document.getElementById('uploadBtn').addEventListener('click', uploadFile);
    
    // Content registration
    document.getElementById('registerBtn').addEventListener('click', registerCopyright);
    
    // License management
    document.getElementById('createLicenseBtn').addEventListener('click', createLicense);
    document.getElementById('searchLicenseBtn').addEventListener('click', searchLicense);
    document.getElementById('loadMarketplaceBtn').addEventListener('click', loadMarketplaceLicenses);
    
    // User statistics
    document.getElementById('loadStatsBtn').addEventListener('click', loadUserStats);
    
    // File drag and drop
    const fileDropArea = document.querySelector('.file-drop');
    const fileInput = document.getElementById('fileInput');
    
    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('dragover');
    });
    
    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('dragover');
    });
    
    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            document.getElementById('uploadBtn').disabled = false;
            document.getElementById('uploadBtn').textContent = `Upload: ${files[0].name}`;
        }
    });
});

// Handle wallet account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function(accounts) {
        if (accounts.length === 0) {
            // User logged out
            userAccount = null;
            document.getElementById('walletAddress').value = '';
            document.getElementById('connectWallet').textContent = 'Connect MetaMask';
            document.getElementById('connectWallet').style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
            document.getElementById('connectWallet').disabled = false;
        } else {
            // User switched accounts
            userAccount = accounts[0];
            document.getElementById('walletAddress').value = userAccount;
            loadUserStats();
            loadUserWorksForLicense();
        }
    });
}

