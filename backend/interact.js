const { ethers } = require("ethers");
require("dotenv").config();

const contractABI = require("../frontend/contract.json").abi;

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, 
contractABI, wallet);

async function registerWork(hash, title, cid) {
  const tx = await contract.registerWork(hash, title, cid);
  await tx.wait();
  console.log("Work registered on-chain:", hash);
}

module.exports = {
  registerWork,
};

