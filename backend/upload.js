import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { create } from '@web3-storage/w3up-client';
import { ethers } from 'ethers';
import { filesFromPaths } from 'files-from-path';
import dotenv from 'dotenv';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Read contract ABI
const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, "../frontend/contract.json"), "utf8"));

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI.abi, wallet);

export async function uploadToIPFS(fileBuffer, fileName = 'upload') {
  // Create temporary file from buffer
  const tempFilePath = `./temp-${Date.now()}-${fileName}`;
  
  // Handle both buffer and file path cases
  if (Buffer.isBuffer(fileBuffer)) {
    fs.writeFileSync(tempFilePath, fileBuffer);
  } else if (typeof fileBuffer === 'string') {
    // If it's a file path, copy the file
    const data = fs.readFileSync(fileBuffer);
    fs.writeFileSync(tempFilePath, data);
  } else {
    throw new Error('Invalid file data provided');
  }

  try {
    const client = await create();
    await client.login(process.env.WEB3_STORAGE_EMAIL);
    await client.setCurrentSpace(process.env.SPACE_DID);

    const files = await filesFromPaths([tempFilePath]);
    const cid = await client.uploadDirectory(files);

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return {
      ipfsHash: cid.toString(),
      Hash: cid.toString(),
      gatewayUrl: `https://w3s.link/ipfs/${cid.toString()}`
    };
  } catch (error) {
    // Clean up temp file even if upload fails
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    throw error;
  }
}

export function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function registerWorkOnChain(hash, title, cid) {
  const tx = await contract.registerWork(hash, title, cid);
  await tx.wait();
  console.log('Work registered on-chain:', hash);
}
