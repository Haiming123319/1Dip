const fs = require('fs');
const crypto = require('crypto');
const { NFTStorage, File } = require('nft.storage');
//const { Web3Storage } = require('web3.storage');
const { registerWork } = require('./interact'); 
require('dotenv').config();

function calculateHash(buffer) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return '0x' + hash;
}

async function uploadToIPFS(filePath) {
  const content = fs.readFileSync(filePath);
  const fileName = filePath.split('/').pop();
  const file = new File([content], fileName);
  const client = new NFTStorage({ token: process.env.NFT_STORAGE_TOKEN });
  const cid = await client.storeBlob(file); // 更轻、更快
  return cid;
}

async function registerWorkOnChain(hash, title, cid) {
  await registerWork(hash, title, cid); // ✅ 继续调用你的 interact.js 函数
}

module.exports = {
  calculateHash,
  uploadToIPFS,
  registerWorkOnChain
};

