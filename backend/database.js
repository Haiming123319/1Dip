import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'drmanager.db');
    }

    // 初始化数据库
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ 数据库连接失败:', err.message);
                    reject(err);
                } else {
                    console.log('✅ 数据库连接成功');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // 创建数据表
    async createTables() {
        const tables = [
            // 文件上传表
            `CREATE TABLE IF NOT EXISTS uploads (
                id TEXT PRIMARY KEY,
                fileName TEXT NOT NULL,
                fileSize INTEGER NOT NULL,
                mimeType TEXT NOT NULL,
                ipfsHash TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'completed'
            )`,

            // 内容注册表
            `CREATE TABLE IF NOT EXISTS contents (
                id TEXT PRIMARY KEY,
                userAddress TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'other',
                price TEXT DEFAULT '0',
                ipfsHash TEXT NOT NULL,
                fileHash TEXT,
                txHash TEXT,
                blockNumber INTEGER,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'registered'
            )`,

            // 交易记录表
            `CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                userAddress TEXT NOT NULL,
                contentId TEXT,
                txHash TEXT,
                amount TEXT DEFAULT '0',
                blockNumber INTEGER,
                gasUsed TEXT,
                timestamp TEXT NOT NULL
            )`,

            // 许可证表
            `CREATE TABLE IF NOT EXISTS licenses (
                id TEXT PRIMARY KEY,
                contentId TEXT NOT NULL,
                userAddress TEXT NOT NULL,
                price TEXT NOT NULL,
                usageScope TEXT,
                region TEXT,
                expiryDate TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                buyerAddress TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (contentId) REFERENCES contents (id)
            )`
        ];

        for (const sql of tables) {
            await this.run(sql);
        }
        console.log('✅ 数据表创建完成');
    }

    // 通用执行方法
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // 通用查询方法
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 通用查询所有方法
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // ============ 上传记录操作 ============
    async saveUpload(uploadData) {
        const sql = `INSERT INTO uploads (id, fileName, fileSize, mimeType, ipfsHash, timestamp, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            uploadData.id,
            uploadData.fileName,
            uploadData.fileSize,
            uploadData.mimeType,
            uploadData.ipfsHash,
            uploadData.timestamp,
            uploadData.status
        ];
        return await this.run(sql, params);
    }

    async getUpload(uploadId) {
        const sql = `SELECT * FROM uploads WHERE id = ?`;
        return await this.get(sql, [uploadId]);
    }

    async getAllUploads() {
        const sql = `SELECT * FROM uploads ORDER BY timestamp DESC`;
        return await this.all(sql);
    }

    // ============ 内容操作 ============
    async saveContent(contentData) {
        const sql = `INSERT INTO contents (id, userAddress, title, description, category, price, ipfsHash, fileHash, txHash, blockNumber, timestamp, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            contentData.id,
            contentData.userAddress,
            contentData.title,
            contentData.description,
            contentData.category,
            contentData.price,
            contentData.ipfsHash,
            contentData.fileHash,
            contentData.txHash,
            contentData.blockNumber,
            contentData.timestamp,
            contentData.status
        ];
        return await this.run(sql, params);
    }

    async getContentsByUser(userAddress) {
        const sql = `SELECT * FROM contents WHERE userAddress = ? ORDER BY timestamp DESC`;
        return await this.all(sql, [userAddress.toLowerCase()]);
    }

    async getAllContents(limit = 50) {
        const sql = `SELECT * FROM contents WHERE status = 'registered' ORDER BY timestamp DESC LIMIT ?`;
        return await this.all(sql, [limit]);
    }

    async getContentById(contentId) {
        const sql = `SELECT * FROM contents WHERE id = ?`;
        return await this.get(sql, [contentId]);
    }

    // ============ 交易记录操作 ============
    async saveTransaction(transactionData) {
        const sql = `INSERT INTO transactions (id, type, userAddress, contentId, txHash, amount, blockNumber, gasUsed, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            transactionData.id,
            transactionData.type,
            transactionData.userAddress,
            transactionData.contentId,
            transactionData.txHash,
            transactionData.amount,
            transactionData.blockNumber,
            transactionData.gasUsed,
            transactionData.timestamp
        ];
        return await this.run(sql, params);
    }

    async getTransactionsByUser(userAddress) {
        const sql = `SELECT * FROM transactions WHERE userAddress = ? ORDER BY timestamp DESC`;
        return await this.all(sql, [userAddress.toLowerCase()]);
    }

    async getAllTransactions() {
        const sql = `SELECT * FROM transactions ORDER BY timestamp DESC`;
        return await this.all(sql);
    }

    // ============ 许可证操作 ============
    async saveLicense(licenseData) {
        const sql = `INSERT INTO licenses (id, contentId, userAddress, price, usageScope, region, expiryDate, status, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            licenseData.id,
            licenseData.contentId,
            licenseData.userAddress,
            licenseData.price,
            licenseData.usageScope,
            licenseData.region,
            licenseData.expiryDate,
            licenseData.status,
            licenseData.timestamp
        ];
        return await this.run(sql, params);
    }

    async getLicenseById(licenseId) {
        const sql = `SELECT l.*, c.title as contentTitle, c.ipfsHash as contentHash 
                     FROM licenses l 
                     JOIN contents c ON l.contentId = c.id 
                     WHERE l.id = ?`;
        return await this.get(sql, [licenseId]);
    }

    async getMarketplaceLicenses() {
        const sql = `SELECT l.*, c.title as contentTitle, c.ipfsHash as contentHash, c.description as contentDescription
                     FROM licenses l 
                     JOIN contents c ON l.contentId = c.id 
                     WHERE l.status = 'active' AND l.expiryDate > datetime('now')
                     ORDER BY l.timestamp DESC LIMIT 50`;
        return await this.all(sql);
    }

    async updateLicenseStatus(licenseId, status, buyerAddress = null) {
        const sql = `UPDATE licenses SET status = ?, buyerAddress = ? WHERE id = ?`;
        return await this.run(sql, [status, buyerAddress, licenseId]);
    }

    async getLicensesByUser(userAddress) {
        const sql = `SELECT l.*, c.title as contentTitle, c.ipfsHash as contentHash
                     FROM licenses l 
                     JOIN contents c ON l.contentId = c.id 
                     WHERE l.userAddress = ? ORDER BY l.timestamp DESC`;
        return await this.all(sql, [userAddress.toLowerCase()]);
    }

    async getPurchasedLicenses(userAddress) {
        const sql = `SELECT l.*, c.title as contentTitle, c.ipfsHash as contentHash
                     FROM licenses l 
                     JOIN contents c ON l.contentId = c.id 
                     WHERE l.buyerAddress = ? ORDER BY l.timestamp DESC`;
        return await this.all(sql, [userAddress.toLowerCase()]);
    }

    // ============ 统计信息 ============
    async getUserStats(userAddress) {
        const userContents = await this.getContentsByUser(userAddress);
        const userTransactions = await this.getTransactionsByUser(userAddress);
        const activeLicenses = await this.getLicensesByUser(userAddress);
        
        const totalEarnings = userTransactions
            .filter(tx => tx.type === 'purchase' || tx.type === 'license_purchase')
            .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

        return {
            totalFiles: userContents.length,
            totalEarnings: totalEarnings.toFixed(4),
            activeLicenses: activeLicenses.filter(l => l.status === 'active').length,
            totalTransactions: userTransactions.length
        };
    }

    async getGlobalStats() {
        const uploads = await this.getAllUploads();
        const contents = await this.getAllContents();
        const transactions = await this.getAllTransactions();
        
        const uniqueUsers = new Set();
        contents.forEach(c => uniqueUsers.add(c.userAddress));

        return {
            totalUploads: uploads.length,
            totalContents: contents.length,
            totalTransactions: transactions.length,
            totalUsers: uniqueUsers.size
        };
    }

    // 关闭数据库连接
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ 关闭数据库失败:', err.message);
                } else {
                    console.log('✅ 数据库连接已关闭');
                }
            });
        }
    }
}

export default Database; 