const assert = require("assert");
const { ethers } = require("hardhat");

describe("DRManager (no chai)", function () {
  let DRManager, dr, owner, user, oracle, hash, price;

  beforeEach(async () => {
    [owner, user, oracle] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DRManager");
    dr = await Factory.deploy();
    hash = "hash123";
    price = ethers.utils.parseEther("0.01"); 
  });

  it("authorizeOracle should allow owner to authorize", async () => {
    await dr.authorizeOracle(oracle.address);
    const isOracle = await dr.isOracle(oracle.address);
    assert.strictEqual(isOracle, true);
  });

  it("should fail if non-owner tries to authorize oracle", async () => {
    let failed = false;
    try {
      await dr.connect(user).authorizeOracle(oracle.address);
    } catch {
      failed = true;
    }
    assert.strictEqual(failed, true);
  });

  it("registerWork should succeed for oracle", async () => {
    await dr.authorizeOracle(oracle.address);
    await dr.connect(oracle).registerWork(hash, "TestTitle", "cid123");

    const work = await dr.getWork(hash);
    assert.strictEqual(work.title, "TestTitle");
    assert.strictEqual(work.cid, "cid123");
    assert.strictEqual(work.author, oracle.address);
  });

  it("registerWork should fail for non-oracle", async () => {
    let failed = false;
    try {
      await dr.connect(user).registerWork(hash, "Title1", "cid123");
    } catch (e) {
      failed = true;
    }
    assert.strictEqual(failed, true, "Non-oracle should not register work");
  });

  it("createLicense should work after registration", async () => {
    await dr.authorizeOracle(oracle.address);
    await dr.connect(oracle).registerWork(hash, "Title1", "cid123");

    const now = Math.floor(Date.now() / 1000);
    await dr.connect(oracle).createLicense(hash, price, "scope", "geo", now + 3600);
    const license = await dr.getLicense(hash);

    assert.strictEqual(license.price.toString(), price.toString());
  });

  it("should fail if non-owner tries to create license", async () => {
    await dr.authorizeOracle(oracle.address);
    await dr.connect(oracle).registerWork(hash, "Work1", "ipfs://cid1");

    let failed = false;
    try {
      await dr.connect(user).createLicense(hash, price, "type", "region", 30);
    } catch {
      failed = true;
    }
    assert.strictEqual(failed, true);
  });

  it("purchaseLicense should succeed with enough ETH", async () => {
    await dr.authorizeOracle(oracle.address);
    await dr.connect(oracle).registerWork(hash, "Title1", "cid123");

    const now = Math.floor(Date.now() / 1000);
    await dr.connect(oracle).createLicense(hash, price, "scope", "geo", now 
+ 3600);

    await dr.connect(user).purchaseLicense(hash, { value: price });

    const license = await dr.getLicense(hash);

    assert.strictEqual(license.licensee, user.address);
    assert.strictEqual(license.isLicensed, true);
  });

  it("purchaseLicense should fail if already purchased", async () => {
    await dr.authorizeOracle(oracle.address);
    await dr.connect(oracle).registerWork(hash, "Title1", "cid123");

    const now = Math.floor(Date.now() / 1000);
    await dr.connect(oracle).createLicense(hash, price, "scope", "geo", 
now + 3600);
    await dr.connect(user).purchaseLicense(hash, { value: price });

    let failed = false;
    try {
      await dr.connect(user).purchaseLicense(hash, { value: price });
    } catch (e) {
      failed = true;
    }
    assert.strictEqual(failed, true, "Should not allow second purchase");
  });
  
  it("should fail to purchase license with insufficient ETH", async () => {
    await dr.authorizeOracle(oracle.address);
    await dr.connect(oracle).registerWork(hash, "Work1", "ipfs://cid1");
    await dr.connect(oracle).createLicense(hash, price, "type", "region", 30);

    let failed = false;
    try {
      await dr.connect(user).purchaseLicense(hash, { value: price.sub(1) });
    } catch {
      failed = true;
    }
    assert.strictEqual(failed, true);
  });
});

