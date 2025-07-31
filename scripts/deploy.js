const hre = require("hardhat");

async function main() {
  const DRManager = await hre.ethers.getContractFactory("DRManager");
  const drManager = await DRManager.deploy();

  await drManager.deployed();

  console.log("DRManager deployed to:", drManager.address);
  console.log("Deployment transaction hash:", drManager.deployTransaction.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

