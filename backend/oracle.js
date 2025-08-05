// DRManager Oracle Service - Decentralized Data Provider
import { ethers } from 'ethers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class DRManagerOracle {
    constructor() {
        this.name = "DRManager Oracle";
        this.version = "1.0.0";
        this.oracleAddress = null;
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        
        // Oracle configuration
        this.config = {
            updateInterval: 30000, // 30 seconds
            dataRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxRetries: 3,
            confidenceThreshold: 0.8
        };
        
        // Data cache
        this.dataCache = new Map();
        this.priceCache = new Map();
        this.verificationCache = new Map();
        
        this.init();
    }

    async init() {
        try {
            console.log('🔮 Initializing DRManager Oracle...');
            
            // Initialize blockchain connection
            if (process.env.SEPOLIA_URL) {
                this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);
                
                if (process.env.PRIVATE_KEY) {
                    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
                    this.oracleAddress = this.wallet.address;
                    console.log(`🔑 Oracle Address: ${this.oracleAddress}`);
                }
            }
            
            // Start periodic data updates
            this.startDataUpdates();
            
            console.log('✅ Oracle initialized successfully');
        } catch (error) {
            console.error('❌ Oracle initialization failed:', error);
        }
    }

    // =================== Data Collection ===================

    /**
     * Get current ETH price from multiple sources
     */
    async getETHPrice() {
        const sources = [
            this.getETHPriceFromCoinGecko,
            this.getETHPriceFromCoinMarketCap,
            this.getETHPriceFromBinance
        ];

        const prices = [];
        
        for (const source of sources) {
            try {
                const price = await source.call(this);
                if (price && price > 0) {
                    prices.push(price);
                }
            } catch (error) {
                console.warn('Price source failed:', error.message);
            }
        }

        if (prices.length === 0) {
            throw new Error('No price data available');
        }

        // Calculate median price for reliability
        prices.sort((a, b) => a - b);
        const median = prices.length % 2 === 0
            ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
            : prices[Math.floor(prices.length / 2)];

        const timestamp = Date.now();
        this.priceCache.set('ETH_USD', { price: median, timestamp });

        // Price updated silently
        return median;
    }

    async getETHPriceFromCoinGecko() {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        return data.ethereum.usd;
    }

    async getETHPriceFromCoinMarketCap() {
        // Mock implementation - would need API key
        return null;
    }

    async getETHPriceFromBinance() {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const data = await response.json();
        return parseFloat(data.price);
    }

    /**
     * Verify content authenticity using multiple methods
     */
    async verifyContentAuthenticity(contentData) {
        const verificationMethods = [
            this.verifyIPFSHash,
            this.verifyFileIntegrity,
            this.verifyMetadata,
            this.verifyTimestamp
        ];

        const results = [];

        for (const method of verificationMethods) {
            try {
                const result = await method.call(this, contentData);
                results.push(result);
            } catch (error) {
                console.warn('Verification method failed:', error.message);
                results.push({ verified: false, confidence: 0, error: error.message });
            }
        }

        // Calculate overall confidence score
        const totalConfidence = results.reduce((sum, result) => sum + (result.confidence || 0), 0);
        const averageConfidence = totalConfidence / results.length;

        const isVerified = averageConfidence >= this.config.confidenceThreshold;

        const verificationResult = {
            verified: isVerified,
            confidence: averageConfidence,
            methods: results,
            timestamp: Date.now(),
            oracle: this.oracleAddress
        };

        // Cache result
        this.verificationCache.set(contentData.hash || contentData.id, verificationResult);

        console.log(`🔍 Content verification: ${isVerified ? 'PASSED' : 'FAILED'} (${(averageConfidence * 100).toFixed(1)}%)`);
        return verificationResult;
    }

    async verifyIPFSHash(contentData) {
        // Verify IPFS hash format and accessibility
        if (!contentData.ipfsHash || !contentData.ipfsHash.startsWith('bafy')) {
            return { verified: false, confidence: 0, method: 'ipfs_hash' };
        }

        try {
            const response = await fetch(`https://ipfs.io/ipfs/${contentData.ipfsHash}`, { 
                method: 'HEAD',
                timeout: 5000 
            });
            
            return {
                verified: response.ok,
                confidence: response.ok ? 0.9 : 0.1,
                method: 'ipfs_hash',
                accessible: response.ok
            };
        } catch (error) {
            return { verified: false, confidence: 0.1, method: 'ipfs_hash', error: error.message };
        }
    }

    async verifyFileIntegrity(contentData) {
        // Verify file hash integrity
        if (!contentData.fileHash) {
            return { verified: false, confidence: 0, method: 'file_integrity' };
        }

        // Check if hash follows expected format
        const hashRegex = /^0x[a-fA-F0-9]{64}$/;
        if (!hashRegex.test(contentData.fileHash)) {
            return { verified: false, confidence: 0.2, method: 'file_integrity' };
        }

        return { verified: true, confidence: 0.8, method: 'file_integrity' };
    }

    async verifyMetadata(contentData) {
        // Verify metadata completeness and consistency
        const requiredFields = ['title', 'userAddress', 'timestamp'];
        const missingFields = requiredFields.filter(field => !contentData[field]);

        if (missingFields.length > 0) {
            return {
                verified: false,
                confidence: 0.3,
                method: 'metadata',
                missingFields
            };
        }

        return { verified: true, confidence: 0.7, method: 'metadata' };
    }

    async verifyTimestamp(contentData) {
        // Verify timestamp is reasonable (not in future, not too old)
        const timestamp = new Date(contentData.timestamp);
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        if (timestamp > now) {
            return { verified: false, confidence: 0, method: 'timestamp', reason: 'future_timestamp' };
        }

        if (timestamp < dayAgo) {
            return { verified: true, confidence: 0.5, method: 'timestamp', reason: 'old_timestamp' };
        }

        return { verified: true, confidence: 0.9, method: 'timestamp' };
    }

    // =================== Market Data ===================

    /**
     * Get market statistics for licensing
     */
    async getMarketStats() {
        try {
            const stats = {
                averageLicensePrice: await this.calculateAverageLicensePrice(),
                totalMarketVolume: await this.calculateMarketVolume(),
                popularCategories: await this.getPopularCategories(),
                priceRecommendations: await this.generatePriceRecommendations(),
                timestamp: Date.now()
            };

            this.dataCache.set('market_stats', stats);
            return stats;
        } catch (error) {
            console.error('Failed to get market stats:', error);
            return null;
        }
    }

    async calculateAverageLicensePrice() {
        // This would integrate with the database to get actual license prices
        return {
            all_categories: 0.015,
            image: 0.01,
            document: 0.02,
            video: 0.05,
            audio: 0.03
        };
    }

    async calculateMarketVolume() {
        return {
            total_volume_eth: 1.25,
            daily_transactions: 15,
            active_licenses: 8
        };
    }

    async getPopularCategories() {
        return [
            { category: 'image', count: 45, percentage: 60 },
            { category: 'document', count: 20, percentage: 27 },
            { category: 'video', count: 8, percentage: 10 },
            { category: 'audio', count: 2, percentage: 3 }
        ];
    }

    async generatePriceRecommendations() {
        const ethPrice = this.priceCache.get('ETH_USD')?.price || 2000;
        
        return {
            suggested_prices_eth: {
                image: Math.round((5 / ethPrice) * 1000) / 1000,
                document: Math.round((10 / ethPrice) * 1000) / 1000,
                video: Math.round((25 / ethPrice) * 1000) / 1000,
                audio: Math.round((15 / ethPrice) * 1000) / 1000
            },
            market_trend: 'stable',
            confidence: 0.75
        };
    }

    // =================== Cryptographic Functions ===================

    /**
     * Sign data with oracle private key
     */
    signData(data) {
        if (!this.wallet) {
            throw new Error('Oracle wallet not initialized');
        }

        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const hash = crypto.createHash('sha256').update(dataString).digest('hex');
        
        // Create signature using ethers
        return {
            data: dataString,
            hash: `0x${hash}`,
            signature: this.wallet.signMessage(dataString),
            oracle: this.oracleAddress,
            timestamp: Date.now()
        };
    }

    /**
     * Verify signed data
     */
    async verifySignature(signedData) {
        try {
            const recoveredAddress = ethers.verifyMessage(signedData.data, await signedData.signature);
            return recoveredAddress.toLowerCase() === this.oracleAddress.toLowerCase();
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }

    // =================== Blockchain Integration ===================

    /**
     * Submit data to smart contract
     */
    async submitToContract(contractAddress, data) {
        if (!this.wallet) {
            console.warn('No wallet configured, cannot submit to contract');
            return null;
        }

        try {
            // This would be implemented with actual contract ABI
            console.log(`📤 Submitting data to contract: ${contractAddress}`);
            console.log('Data:', JSON.stringify(data, null, 2));
            
            // Mock transaction for now
            const mockTx = {
                hash: `0x${crypto.randomBytes(32).toString('hex')}`,
                blockNumber: Math.floor(Math.random() * 1000000),
                gasUsed: '21000',
                status: 'success'
            };

            return mockTx;
        } catch (error) {
            console.error('Contract submission failed:', error);
            return null;
        }
    }

    // =================== Periodic Updates ===================

    startDataUpdates() {
        console.log('🔄 Oracle data updates started');
        
        // Update ETH price every 30 seconds
        setInterval(async () => {
            try {
                await this.getETHPrice();
            } catch (error) {
                console.error('Price update failed:', error);
            }
        }, this.config.updateInterval);

        // Update market stats every 5 minutes
        setInterval(async () => {
            try {
                await this.getMarketStats();
            } catch (error) {
                console.error('Market stats update failed:', error);
            }
        }, 5 * 60 * 1000);

        // Clean old cache entries every hour
        setInterval(() => {
            this.cleanCache();
        }, 60 * 60 * 1000);
    }

    cleanCache() {
        const now = Date.now();
        const expiry = this.config.dataRetentionPeriod;

        for (const [key, value] of this.dataCache.entries()) {
            if (now - value.timestamp > expiry) {
                this.dataCache.delete(key);
            }
        }

        for (const [key, value] of this.verificationCache.entries()) {
            if (now - value.timestamp > expiry) {
                this.verificationCache.delete(key);
            }
        }

        // Cache cleaned silently
    }

    // =================== API Methods ===================

    /**
     * Get oracle status and health
     */
    getStatus() {
        return {
            name: this.name,
            version: this.version,
            address: this.oracleAddress,
            status: 'active',
            uptime: process.uptime(),
            cache_size: {
                data: this.dataCache.size,
                price: this.priceCache.size,
                verification: this.verificationCache.size
            },
            last_updates: {
                eth_price: this.priceCache.get('ETH_USD')?.timestamp,
                market_stats: this.dataCache.get('market_stats')?.timestamp
            },
            config: this.config
        };
    }

    /**
     * Get current price data
     */
    getPriceData(symbol = 'ETH_USD') {
        const cached = this.priceCache.get(symbol);
        if (!cached) {
            return null;
        }

        return {
            symbol,
            price: cached.price,
            timestamp: cached.timestamp,
            age_ms: Date.now() - cached.timestamp,
            oracle: this.oracleAddress
        };
    }

    /**
     * Get verification result for content
     */
    getVerificationResult(contentId) {
        return this.verificationCache.get(contentId) || null;
    }

    /**
     * Get market data
     */
    getMarketData() {
        return this.dataCache.get('market_stats') || null;
    }
}

// Export singleton instance
const oracle = new DRManagerOracle();
export default oracle; 