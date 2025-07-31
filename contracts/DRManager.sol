// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Digital Rights Manager Contract
/// @notice Register copyright, create license, and manage royalty payments

contract DRManager {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    struct Work {
        address author;
        string title;
        string cid; // IPFS content ID
        uint256 timestamp;
        bool exists;
    }

    struct License {
        uint256 price;
        string usageScope;
        string region;
        uint256 expiry;
        address licensee;
        bool isLicensed; 
    }

    mapping(string => Work) public works;           // hash → work
    mapping(string => License) public licenses;     // hash → license
    mapping(address => bool) public isOracle;       // oracle whitelist

    // ───────────── Events ─────────────
    event WorkRegistered(address indexed author, string hash, string cid);
    event LicenseCreated(address indexed author, string hash, uint256 price);
    event LicensePurchased(address indexed buyer, string hash, uint256 amount);

    // ───────────── Modifiers ─────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyOracle() {
        require(isOracle[msg.sender], "Not authorized oracle");
        _;
    }

    // ───────────── Core Functions ─────────────

    /// @notice Register a work with its hash, title and IPFS CID
    function registerWork(string memory hash, string memory title, string memory cid) external onlyOracle {
        require(!works[hash].exists, "Work already registered");

        works[hash] = Work({
            author: tx.origin,
            title: title,
            cid: cid,
            timestamp: block.timestamp,
            exists: true
        });

        emit WorkRegistered(tx.origin, hash, cid);
    }

    /// @notice Create a license for a registered work
    function createLicense(
        string memory hash,
        uint256 price,
        string memory usageScope,
        string memory region,
        uint256 expiry
    ) external {
        require(works[hash].exists, "Work not registered");
        require(msg.sender == works[hash].author, "Only author can create license");

        licenses[hash] = License({
            price: price,
            usageScope: usageScope,
            region: region,
            expiry: expiry,
            licensee: address(0),
            isLicensed: false
        });

        emit LicenseCreated(msg.sender, hash, price);
    }

    /// @notice Purchase a license with on-chain payment
    function purchaseLicense(string memory hash) external payable {
        require(licenses[hash].price > 0, "License does not exist");
        require(msg.value >= licenses[hash].price, "Insufficient payment");
        require(licenses[hash].licensee == address(0), "Already purchased");
        require(block.timestamp < licenses[hash].expiry, "License expired");

        licenses[hash].licensee = msg.sender;
        licenses[hash].isLicensed = true;

        emit LicensePurchased(msg.sender, hash, msg.value);
    }

    // ───────────── Admin & Query Functions ─────────────

    function authorizeOracle(address oracleAddr) external onlyOwner {
        isOracle[oracleAddr] = true;
    }

    function revokeOracle(address oracleAddr) external onlyOwner {
        isOracle[oracleAddr] = false;
    }

    function getLicense(string memory hash) public view returns (License memory) {
        return licenses[hash];
    }

    function getWork(string memory hash) public view returns (Work memory) {
        return works[hash];
    }

    /// @notice Withdraw accumulated ETH
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}

