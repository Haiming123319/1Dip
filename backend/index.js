const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 导入您现有的上传处理器
const { uploadToIPFS } = require('./upload.js'); // 使用您现有的上传逻辑

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 (为前端提供服务)
app.use(express.static(path.join(__dirname, '../frontend')));

// 配置文件上传
const upload = multer({
    storage: multer.memoryStorage(), // 存储在内存中
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 文件类型验证
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

// 存储用户数据 (开发阶段用内存，生产环境建议用数据库)
const userData = {
    uploads: new Map(),      // 上传记录
    contents: new Map(),     // 内容记录  
    transactions: new Map()  // 交易记录
};

// =================== API 路由 ===================

// 1. 文件上传到 IPFS
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('📤 get upload request:', req.file?.originalname);
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'not receive the file'
            });
        }

        // 验证文件
        if (req.file.size > 100 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'file size beyond 100MB '
            });
        }

        // 调用您现有的上传函数
        const uploadResult = await uploadToIPFS(req.file.buffer, req.file.originalname);
        
        // 生成上传ID
        const uploadId = Date.now().toString();
        
        // 保存上传记录
        userData.uploads.set(uploadId, {
            id: uploadId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            ipfsHash: uploadResult.ipfsHash || uploadResult.Hash, // 兼容不同返回格式
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

// 2. 保存内容注册信息 (区块链交易成功后调用)
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

        // 验证必需字段
        if (!userAddress || !title || !ipfsHash || !txHash) {
            return res.status(400).json({
                success: false,
                error: 'lack of necessary info'
            });
        }

        // 生成内容ID
        const contentId = Date.now().toString();

        // 保存内容记录
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

// 3. 获取用户的内容列表
app.get('/api/content/user/:address', async (req, res) => {
    try {
        const userAddress = req.params.address.toLowerCase();
        console.log('📋 get user content:', userAddress);

        // 过滤出该用户的内容
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

// 4. 获取所有公开内容 (市场)
app.get('/api/content/marketplace', async (req, res) => {
    try {
        console.log('🛒 get market content');

        // 获取所有内容 (实际应用中可添加分页和过滤)
        const allContents = Array.from(userData.contents.values())
            .filter(content => content.status === 'registered')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50); // 限制返回数量

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

// 5. 记录交易信息
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

// 6. 获取上传状态
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

// 7. 健康检查
app.get('/api/health', async (req, res) => {
    try {
        // 检查各种服务状态
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                api: 'running',
                ipfs: 'unknown', // 可以调用 IPFS 检查
                database: 'memory' // 当前使用内存存储
            },
            stats: {
                totalUploads: userData.uploads.size,
                totalContents: userData.contents.size,
                totalTransactions: userData.transactions.size
            }
        };

        // 可以添加 IPFS 健康检查
        try {
            // 这里可以调用您的 IPFS 检查函数
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

// 8. 获取统计数据
app.get('/api/stats/:address?', async (req, res) => {
    try {
        const userAddress = req.params.address?.toLowerCase();

        if (userAddress) {
            // 用户统计
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
                    activeLicenses: 0, // 需要从合约获取
                    totalTransactions: userTransactions.length
                }
            });
        } else {
            // 全局统计
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

// =================== 错误处理 ===================

// 文件上传错误处理
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: '文件大小超过限制 (100MB)'
            });
        }
    }
    
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: error.message || '服务器内部错误'
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'API 端点不存在'
    });
});

// =================== 启动服务器 ===================

app.listen(PORT, () => {
    console.log('🚀 DRManager 后端服务已启动');
    console.log(`📡 API 服务: http://localhost:${PORT}`);
    console.log(`🌐 前端界面: http://localhost:${PORT}`);
    console.log(`💾 当前使用内存存储 (重启后数据会丢失)`);
    console.log('');
    console.log('📋 可用的 API 端点:');
    console.log('  POST /api/upload              - 文件上传');
    console.log('  POST /api/content/register     - 注册内容');
    console.log('  GET  /api/content/user/:address - 用户内容');
    console.log('  GET  /api/content/marketplace  - 市场内容');
    console.log('  POST /api/transaction/record   - 记录交易');
    console.log('  GET  /api/stats/:address       - 获取统计');
    console.log('  GET  /api/health               - 健康检查');
    console.log('');
    
    // 定期保存数据到文件 (可选)
    if (process.env.SAVE_TO_FILE === 'true') {
        setInterval(saveDataToFile, 60000); // 每分钟保存一次
    }
});

// 数据持久化 (可选)
function saveDataToFile() {
    try {
        const data = {
            uploads: Array.from(userData.uploads.entries()),
            contents: Array.from(userData.contents.entries()),
            transactions: Array.from(userData.transactions.entries()),
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('./data-backup.json', JSON.stringify(data, null, 2));
        console.log('💾 数据已备份到文件');
    } catch (error) {
        console.error('❌ 数据备份失败:', error);
    }
}

// 启动时加载数据 (可选)
function loadDataFromFile() {
    try {
        if (fs.existsSync('./data-backup.json')) {
            const data = JSON.parse(fs.readFileSync('./data-backup.json', 'utf8'));
            
            userData.uploads = new Map(data.uploads || []);
            userData.contents = new Map(data.contents || []);
            userData.transactions = new Map(data.transactions || []);
            
            console.log('📂 从文件加载数据成功');
        }
    } catch (error) {
        console.error('❌ 从文件加载数据失败:', error);
    }
}

// 启动时加载数据
if (process.env.SAVE_TO_FILE === 'true') {
    loadDataFromFile();
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    
    if (process.env.SAVE_TO_FILE === 'true') {
        saveDataToFile();
        console.log('💾 数据已保存');
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
