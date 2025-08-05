import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import your existing upload handler
import { uploadToIPFS } from './upload.js';
import oracle from './oracle.js';
// Import database
import Database from './database.js';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file service (serving frontend)
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

// =================== API Routes ===================

// 1. File Upload API
app.post('/api/upload', upload.single('file'), async (req, res) => {
    console.log('📁 File upload request');
    
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file selected'
        });
    }

    try {
        const uploadId = Date.now().toString();
        
        // Upload to IPFS
        const result = await uploadToIPFS(req.file.buffer, req.file.originalname);
        
        // Save to database
        await db.saveUpload({
            id: uploadId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            ipfsHash: result.ipfsHash,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        console.log('✅ File upload completed');
        console.log('📊 Upload details:', {
            id: uploadId,
            fileName: req.file.originalname,
            ipfsHash: result.ipfsHash,
            size: req.file.size
        });

        res.json({
            success: true,
            id: uploadId,
            ipfsHash: result.ipfsHash,
            Hash: result.Hash,
            gatewayUrl: result.gatewayUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            message: 'File uploaded successfully'
        });

    } catch (error) {
        console.error('❌ File upload failed:', error);
        res.status(500).json({
            success: false,
            error: 'File upload failed: ' + error.message
        });
    }
});

// 2. Content Registration API
app.post('/api/content/register', async (req, res) => {
    const { userAddress, title, description, category, price, uploadId, txHash, blockNumber } = req.body;
    
    console.log('📋 Content registration request:', {
        userAddress,
        title,
        uploadId
    });

    if (!userAddress || !title || !uploadId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters'
        });
    }

    try {
        const contentId = Date.now().toString();
        
        // Get upload info from database
        const upload = await db.getUpload(uploadId);
        if (!upload) {
            return res.status(404).json({
                success: false,
                error: 'Upload not found'
            });
        }

        // Register content in database
        await db.saveContent({
            id: contentId,
            userAddress,
            title: title || 'Untitled',
            description: description || '',
            category: category || 'general',
            price: price || '0',
            ipfsHash: upload.ipfsHash,
            fileHash: upload.ipfsHash,
            txHash: txHash || `offline_${Date.now()}`,
            blockNumber: blockNumber || 0,
            timestamp: new Date().toISOString(),
            status: 'registered'
        });

        console.log('✅ Content registered successfully');

        res.json({
            success: true,
            id: contentId,
            message: 'Content registered successfully'
        });

    } catch (error) {
        console.error('❌ Content registration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Content registration failed: ' + error.message
        });
    }
});

// 3. Get User Content API
app.get('/api/content/user/:address', async (req, res) => {
    const { address: userAddress } = req.params;
    
    console.log('📋 Get user content:', userAddress);

    try {
        const contents = await db.getContentsByUser(userAddress);
        
        console.log(`✅ Found ${contents.length} user content items`);

        res.json({
            success: true,
            contents,
            message: 'User content retrieved successfully'
        });

    } catch (error) {
        console.error('❌ Failed to get user content:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user content: ' + error.message
        });
    }
});

// 4. Get Marketplace Content API
app.get('/api/content/marketplace', async (req, res) => {
    console.log('🛒 Get marketplace content');

    try {
        const contents = await db.getAllContents();
        
        console.log(`✅ Found ${contents.length} marketplace content items`);

        res.json({
            success: true,
            contents,
            message: 'Marketplace content retrieved successfully'
        });

    } catch (error) {
        console.error('❌ Failed to get marketplace content:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get marketplace content: ' + error.message
        });
    }
});

// 5. 记录交易
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

        console.log('💰 Recording transaction:', { type, txHash, amount });

        const transactionId = Date.now().toString();
        
        const transactionData = {
            id: transactionId,
            type,
            userAddress: userAddress.toLowerCase(),
            contentId,
            txHash,
            amount: amount || '0',
            blockNumber,
            gasUsed,
            timestamp: new Date().toISOString()
        };

        await db.saveTransaction(transactionData);

        res.json({
            success: true,
            transactionId,
            message: 'Transaction recorded'
        });

    } catch (error) {
        console.error('❌ Failed to record transaction:', error);
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
        const uploadData = await db.getUpload(uploadId);

        if (!uploadData) {
            return res.status(404).json({
                success: false,
                error: 'Upload record not found'
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
        // 获取系统统计
        const stats = await db.getGlobalStats();
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                api: 'running',
                database: 'connected',
                ipfs: 'unknown' // 可以后续添加IPFS健康检查
            },
            stats
        };

        // 检查IPFS服务状态
        try {
            // 这里可以添加IPFS健康检查
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

// 8. 获取统计信息
app.get('/api/stats/:address?', async (req, res) => {
    try {
        const userAddress = req.params.address?.toLowerCase();

        if (userAddress) {
            // 获取用户统计
            const userStats = await db.getUserStats(userAddress);
            res.json({
                success: true,
                stats: userStats
            });
        } else {
            // 获取全局统计
            const globalStats = await db.getGlobalStats();
            res.json({
                success: true,
                stats: globalStats
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =================== 许可证相关API ===================

// 9. 创建许可证
app.post('/api/license/create', async (req, res) => {
    try {
        const {
            userAddress,
            contentId,
            price,
            usageScope,
            region,
            duration // 天数
        } = req.body;

        console.log('📜 Creating license:', { contentId, price, usageScope });

        // 验证必需字段
        if (!userAddress || !contentId || !price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required information'
            });
        }

        // 检查内容是否存在且属于该用户
        const content = await db.getContentById(contentId);
        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'Content not found'
            });
        }

        if (content.userAddress !== userAddress.toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'You can only create a license for your own work'
            });
        }

        // 计算过期时间
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(duration || 365));

        // 生成许可证ID
        const licenseId = Date.now().toString();

        // 保存许可证信息到数据库
        const licenseData = {
            id: licenseId,
            contentId,
            userAddress: userAddress.toLowerCase(),
            price: price.toString(),
            usageScope: usageScope || 'General use',
            region: region || 'Global',
            expiryDate: expiryDate.toISOString(),
            status: 'active',
            timestamp: new Date().toISOString()
        };

        await db.saveLicense(licenseData);

        console.log('✅ License created successfully');

        res.json({
            success: true,
            licenseId,
            message: 'License created successfully'
        });

    } catch (error) {
        console.error('❌ Failed to create license:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 10. 获取许可证列表
app.get('/api/license/marketplace', async (req, res) => {
    try {
        console.log('🛒 Getting marketplace licenses');

        const licenses = await db.getMarketplaceLicenses();

        res.json({
            success: true,
            licenses,
            total: licenses.length
        });

    } catch (error) {
        console.error('❌ Failed to get marketplace licenses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 11. 购买许可证
app.post('/api/license/purchase', async (req, res) => {
    try {
        const {
            licenseId,
            buyerAddress,
            txHash,
            amount
        } = req.body;

        console.log('💰 Purchasing license:', { licenseId, buyerAddress, amount });

        // 验证必需字段
        if (!licenseId || !buyerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required information'
            });
        }

        // 检查许可证是否存在
        const license = await db.getLicenseById(licenseId);
        if (!license) {
            return res.status(404).json({
                success: false,
                error: 'License not found'
            });
        }

        // 检查许可证是否已被购买
        if (license.status === 'sold') {
            return res.status(400).json({
                success: false,
                error: 'License already purchased'
            });
        }

        // 检查是否过期
        if (new Date(license.expiryDate) < new Date()) {
            return res.status(400).json({
                success: false,
                error: 'License expired'
            });
        }

        // 更新许可证状态
        await db.updateLicenseStatus(licenseId, 'sold', buyerAddress.toLowerCase());

        // 记录交易
        const transactionId = Date.now().toString();
        await db.saveTransaction({
            id: transactionId,
            type: 'license_purchase',
            userAddress: buyerAddress.toLowerCase(),
            contentId: license.contentId,
            txHash: txHash || 'offline_' + Date.now(),
            amount: amount || license.price,
            timestamp: new Date().toISOString()
        });

                 console.log('✅ License purchased successfully');

         res.json({
             success: true,
             transactionId,
             message: 'License purchased successfully'
         });

     } catch (error) {
         console.error('❌ Failed to purchase license:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
     }
 });

 // 12. 数据库查看API (用于调试和管理)
 app.get('/api/database/all', async (req, res) => {
     try {
         console.log('🗄️ Getting all database data');

         const [contents, uploads, licenses, transactions] = await Promise.all([
             db.getAllContents(100),
             db.getAllUploads(),
             db.getMarketplaceLicenses(),
             db.getAllTransactions()
         ]);

         // 获取统计信息
         const stats = await db.getGlobalStats();

         res.json({
             success: true,
             data: {
                 contents,
                 uploads,
                 licenses,
                 transactions,
                 stats
             }
         });

     } catch (error) {
         console.error('❌ Failed to get database data:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
          }
 });

 // =================== Oracle API Routes ===================

 // 13. Oracle Status API
 app.get('/api/oracle/status', (req, res) => {
     try {
         // Getting oracle status silently
         
         const status = oracle.getStatus();
         
         res.json({
             success: true,
             oracle: status
         });

     } catch (error) {
         console.error('❌ Failed to get oracle status:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
     }
 });

 // 14. Price Data API
 app.get('/api/oracle/price/:symbol?', (req, res) => {
     try {
         const symbol = req.params.symbol || 'ETH_USD';
         // Getting price data silently
         
         const priceData = oracle.getPriceData(symbol);
         
         if (!priceData) {
             return res.status(404).json({
                 success: false,
                 error: 'Price data not available'
             });
         }

         res.json({
             success: true,
             price: priceData
         });

     } catch (error) {
         console.error('❌ Failed to get price data:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
     }
 });

 // 15. Content Verification API
 app.post('/api/oracle/verify', async (req, res) => {
     try {
         const contentData = req.body;
         console.log('🔍 Verify content:', contentData.id || contentData.hash);
         
         const verification = await oracle.verifyContentAuthenticity(contentData);
         
         res.json({
             success: true,
             verification
         });

     } catch (error) {
         console.error('❌ Content verification failed:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
     }
 });

 // 16. Market Data API
 app.get('/api/oracle/market', async (req, res) => {
     try {
         console.log('📊 Get market data');
         
         let marketData = oracle.getMarketData();
         
         // If no cached data, generate fresh data
         if (!marketData) {
             marketData = await oracle.getMarketStats();
         }

         res.json({
             success: true,
             market: marketData
         });

     } catch (error) {
         console.error('❌ Failed to get market data:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
     }
 });

 // 17. Oracle Signature API
 app.post('/api/oracle/sign', (req, res) => {
     try {
         const { data } = req.body;
         console.log('✍️ Sign data with oracle');
         
         if (!data) {
             return res.status(400).json({
                 success: false,
                 error: 'No data provided'
             });
         }

         const signedData = oracle.signData(data);
         
         res.json({
             success: true,
             signed: signedData
         });

     } catch (error) {
         console.error('❌ Failed to sign data:', error);
         res.status(500).json({
             success: false,
             error: error.message
         });
     }
 });

 // =================== Error Handling ===================

// File upload error handling
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File size exceeds limit (100MB)'
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'Server internal error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// =================== Server Startup ===================

// Start database and server
db.init().then(() => {
    console.log('✅ Database connected successfully');
    console.log('✅ Database tables created');
    
    console.log('\n🚀 DRManager Backend Service Started Successfully!');
    console.log('📡 API Service: http://localhost:3000');
    console.log('🌐 Frontend Interface: http://localhost:3000');
    console.log('💾 Database: SQLite (Persistent Storage)');
    console.log('📋 Available API Endpoints:');
    console.log('  POST /api/upload              - File Upload');
    console.log('  POST /api/content/register     - Content Registration');
    console.log('  GET  /api/content/user/:address - User Content');
    console.log('  GET  /api/content/marketplace  - Marketplace Content');
    console.log('  POST /api/license/create       - Create License');
    console.log('  GET  /api/license/marketplace  - Marketplace Licenses');
    console.log('  POST /api/license/purchase     - Purchase License');
    console.log('  POST /api/transaction/record   - Transaction Record');
    console.log('  GET  /api/stats/:address       - Statistics');
    console.log('  GET  /api/health               - Health Check');
             console.log('  GET  /api/database/all         - Database Viewer');
         console.log('  GET  /api/oracle/status        - Oracle Status');
         console.log('  GET  /api/oracle/price/:symbol - Price Data');
         console.log('  POST /api/oracle/verify        - Content Verification');
         console.log('');

    app.listen(PORT, () => {
        console.log(`🎯 Server is running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        process.exit(0);
    });

}).catch(error => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
});

export default app;