const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import your existing upload handler
const { uploadToIPFS } = require('./upload.js'); // Use your existing upload logic

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file service (serving frontend) ()
app.use(express.static(path.join(__dirname, '../frontend')));

// File upload
const upload = multer({
    storage: multer.memoryStorage(), // Stored in memory
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // File type validation
        const allowedTypes = [
            'image/', 'application/', 'text/', 'audio/', 'video/'
        ];
        
        const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
        
        if (isAllowed) {
            cb(null, true);
        } else {
            cb(new Error('unsupport file type'), false);
        }
    }
});

// Store user data (Use memory in development; database recommended for production)
const userData = {
    uploads: new Map(),      // Upload records
    contents: new Map(),     //   
    transactions: new Map()  // 
};

// =================== API  ===================

// 1. File upload IPFS
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('📤 get upload request:', req.file?.originalname);
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'not receive the file'
            });
        }

        // 
        if (req.file.size > 100 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'file size beyond 100MB '
            });
        }

        // 
        const uploadResult = await uploadToIPFS(req.file.buffer, req.file.originalname);
        
        // ID
        const uploadId = Date.now().toString();
        
        // Upload records
        userData.uploads.set(uploadId, {
            id: uploadId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            ipfsHash: uploadResult.ipfsHash || uploadResult.Hash, // 
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        console.log('✅ upload successfully:', uploadResult.ipfsHash || uploadResult.Hash);

        res.json({
            success: true,
            uploadId: uploadId,
            ipfsHash: uploadResult.ipfsHash || uploadResult.Hash,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            gatewayUrl: uploadResult.gatewayUrl || `https://ipfs.io/ipfs/${uploadResult.ipfsHash || uploadResult.Hash}`
        });

    } catch (error) {
        console.error('❌ failed to upload', error);
        res.status(500).json({
            success: false,
            error: error.message || 'fail'
        });
    }
});

// 2.  ()
app.post('/api/content/register', async (req, res) => {
    try {
        const {
            userAddress,
            title,
            description,
            category,
            price,
            ipfsHash,
            txHash,
            blockNumber
        } = req.body;

        console.log('📝 save the register info', { title, ipfsHash, txHash });

        // 
        if (!userAddress || !title || !ipfsHash || !txHash) {
            return res.status(400).json({
                success: false,
                error: 'lack of necessary info'
            });
        }

        // ID
        const contentId = Date.now().toString();

        // 
        const contentData = {
            id: contentId,
            userAddress: userAddress.toLowerCase(),
            title,
            description: description || '',
            category: category || 'other',
            price: price || '0',
            ipfsHash,
            txHash,
            blockNumber,
            timestamp: new Date().toISOString(),
            status: 'registered'
        };

        userData.contents.set(contentId, contentData);

        console.log('✅ already save the info');

        res.json({
            success: true,
            contentId,
            message: 'contents register successfully'
        });

    } catch (error) {
        console.error('❌ failed to save', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 3. 
app.get('/api/content/user/:address', async (req, res) => {
    try {
        const userAddress = req.params.address.toLowerCase();
        console.log('📋 get user content:', userAddress);

        // 
        const userContents = Array.from(userData.contents.values())
            .filter(content => content.userAddress === userAddress)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            contents: userContents,
            total: userContents.length
        });

    } catch (error) {
        console.error('❌ fail to access user content:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 4.  ()
app.get('/api/content/marketplace', async (req, res) => {
    try {
        console.log('🛒 get market content');

        //  ()
        const allContents = Array.from(userData.contents.values())
            .filter(content => content.status === 'registered')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50); // 

        res.json({
            success: true,
            contents: allContents,
            total: allContents.length
        });

    } catch (error) {
        console.error('❌ fail to access market content:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 5. 
app.post('/api/transaction/record', async (req, res) => {
    try {
        const {
            type,           // 'register', 'purchase', 'license'
            userAddress,
            contentId,
            txHash,
            amount,
            blockNumber,
            gasUsed
        } = req.body;

        console.log('💰 record transaction:', { type, txHash, amount });

        const transactionId = Date.now().toString();
        
        userData.transactions.set(transactionId, {
            id: transactionId,
            type,
            userAddress: userAddress.toLowerCase(),
            contentId,
            txHash,
            amount: amount || '0',
            blockNumber,
            gasUsed,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            transactionId,
            message: 'save transaction'
        });

    } catch (error) {
        console.error('❌ fail to recorod transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 6. 
app.get('/api/upload/status/:uploadId', async (req, res) => {
    try {
        const uploadId = req.params.uploadId;
        const uploadData = userData.uploads.get(uploadId);

        if (!uploadData) {
            return res.status(404).json({
                success: false,
                error: 'upload history not exists'
            });
        }

        res.json({
            success: true,
            upload: uploadData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 7. 
app.get('/api/health', async (req, res) => {
    try {
        // 
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                api: 'running',
                ipfs: 'unknown', //  IPFS 
                database: 'memory' // 
            },
            stats: {
                totalUploads: userData.uploads.size,
                totalContents: userData.contents.size,
                totalTransactions: userData.transactions.size
            }
        };

        //  IPFS 
        try {
            //  IPFS 
            health.services.ipfs = 'healthy';
        } catch {
            health.services.ipfs = 'error';
        }

        res.json(health);

    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// 8. 
app.get('/api/stats/:address?', async (req, res) => {
    try {
        const userAddress = req.params.address?.toLowerCase();

        if (userAddress) {
            // 
            const userContents = Array.from(userData.contents.values())
                .filter(content => content.userAddress === userAddress);
            
            const userTransactions = Array.from(userData.transactions.values())
                .filter(tx => tx.userAddress === userAddress);

            const totalEarnings = userTransactions
                .filter(tx => tx.type === 'purchase')
                .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

            res.json({
                success: true,
                stats: {
                    totalFiles: userContents.length,
                    totalEarnings: totalEarnings.toFixed(4),
                    activeLicenses: 0, // 
                    totalTransactions: userTransactions.length
                }
            });
        } else {
            // 
            res.json({
                success: true,
                stats: {
                    totalUploads: userData.uploads.size,
                    totalContents: userData.contents.size,
                    totalTransactions: userData.transactions.size,
                    totalUsers: new Set(Array.from(userData.contents.values()).map(c => c.userAddress)).size
                }
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===================  ===================

// File upload
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: ' (100MB)'
            });
        }
    }
    
    console.error(':', error);
    res.status(500).json({
        success: false,
        error: error.message || ''
    });
});

// 404 
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'API '
    });
});

// ===================  ===================

app.listen(PORT, () => {
    console.log('🚀 DRManager ');
    console.log(`📡 API : http://localhost:${PORT}`);
    console.log(`🌐 : http://localhost:${PORT}`);
    console.log(`💾  ()`);
    console.log('');
    console.log('📋  API :');
    console.log('  POST /api/upload              - File upload');
    console.log('  POST /api/content/register     - ');
    console.log('  GET  /api/content/user/:address - ');
    console.log('  GET  /api/content/marketplace  - ');
    console.log('  POST /api/transaction/record   - ');
    console.log('  GET  /api/stats/:address       - ');
    console.log('  GET  /api/health               - ');
    console.log('');
    
    //  ()
    if (process.env.SAVE_TO_FILE === 'true') {
        setInterval(saveDataToFile, 60000); // 
    }
});

//  ()
function saveDataToFile() {
    try {
        const data = {
            uploads: Array.from(userData.uploads.entries()),
            contents: Array.from(userData.contents.entries()),
            transactions: Array.from(userData.transactions.entries()),
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('./data-backup.json', JSON.stringify(data, null, 2));
        console.log('💾 ');
    } catch (error) {
        console.error('❌ :', error);
    }
}

//  ()
function loadDataFromFile() {
    try {
        if (fs.existsSync('./data-backup.json')) {
            const data = JSON.parse(fs.readFileSync('./data-backup.json', 'utf8'));
            
            userData.uploads = new Map(data.uploads || []);
            userData.contents = new Map(data.contents || []);
            userData.transactions = new Map(data.transactions || []);
            
            console.log('📂 ');
        }
    } catch (error) {
        console.error('❌ :', error);
    }
}

// 
if (process.env.SAVE_TO_FILE === 'true') {
    loadDataFromFile();
}

// 
process.on('SIGINT', () => {
    console.log('\n🛑 ...');
    
    if (process.env.SAVE_TO_FILE === 'true') {
        saveDataToFile();
        console.log('💾 ');
    }
    
    process.exit(0);
});

module.exports = app;
// const express = require('express');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const { uploadToIPFS, calculateHash, registerWorkOnChain } = require('./upload');

// require('dotenv').config();
// const app = express();
// const PORT = 3000;
// const upload = multer({ dest: 'uploads/' });

// app.post('/upload', upload.single('file'), async (req, res) => {
//     try {
//         const filePath = req.file.path;
//         const buffer = fs.readFileSync(filePath);

//         const hash = calculateHash(buffer);
//         const cid = await uploadToIPFS(filePath);
//         const title = req.body.title || "Untitled";

//         await registerWorkOnChain(hash, title, cid);

//         fs.unlinkSync(filePath);
//         res.json({ hash, cid });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Upload failed');
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });
