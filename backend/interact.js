import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Read contract ABI
const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, "../frontend/contract.json"), "utf8"));

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, 
contractABI.abi, wallet);

async function registerWork(hash, title, cid) {
  const tx = await contract.registerWork(hash, title, cid);
  await tx.wait();
  console.log("Work registered on-chain:", hash);
}

export {
  registerWork,
};

