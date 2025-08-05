// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ContentVerification
 * @dev Smart contract for verifying digital content authenticity and integrity
 * @author DRManager Team
 */
contract ContentVerification {
    
    // =================== State Variables ===================
    
    address public owner;
    address public drManagerContract;
    
    // Verification structure
    struct ContentProof {
        bytes32 contentHash;
        string ipfsHash;
        address author;
        uint256 timestamp;
        uint256 blockNumber;
        bool isVerified;
        uint8 verificationScore; // 0-100
        string[] verificationMethods;
        address verifier;
    }
    
    // Evidence structure for disputes
    struct Evidence {
        uint256 contentId;
        address submitter;
        string evidenceType; // "ownership", "prior_art", "fraud"
        string evidenceData; // IPFS hash of evidence
        uint256 timestamp;
        bool isValid;
    }
    
    // Verification request structure
    struct VerificationRequest {
        uint256 contentId;
        address requester;
        uint256 fee;
        bool isPaid;
        bool isProcessed;
        uint256 requestTime;
        uint256 deadline;
    }
    
    // Storage mappings
    mapping(uint256 => ContentProof) public contentProofs;
    mapping(uint256 => Evidence[]) public contentEvidence;
    mapping(uint256 => VerificationRequest) public verificationRequests;
    mapping(address => bool) public authorizedVerifiers;
    mapping(bytes32 => uint256) public hashToContentId;
    mapping(address => uint256[]) public authorContent;
    
    // Counters
    uint256 public nextContentId = 1;
    uint256 public nextRequestId = 1;
    
    // Configuration
    uint256 public verificationFee = 0.001 ether;
    uint256 public verificationDeadline = 7 days;
    uint8 public minimumScore = 75;
    
    // =================== Events ===================
    
    event ContentRegistered(
        uint256 indexed contentId,
        bytes32 indexed contentHash,
        address indexed author,
        string ipfsHash
    );
    
    event VerificationCompleted(
        uint256 indexed contentId,
        bool isVerified,
        uint8 score,
        address verifier
    );
    
    event EvidenceSubmitted(
        uint256 indexed contentId,
        address indexed submitter,
        string evidenceType
    );
    
    event VerificationRequested(
        uint256 indexed requestId,
        uint256 indexed contentId,
        address indexed requester
    );
    
    event VerifierAuthorized(address indexed verifier, bool authorized);
    
    event DisputeRaised(uint256 indexed contentId, address indexed challenger);
    
    // =================== Modifiers ===================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyVerifier() {
        require(authorizedVerifiers[msg.sender], "Only authorized verifiers");
        _;
    }
    
    modifier onlyDRManager() {
        require(msg.sender == drManagerContract, "Only DRManager contract");
        _;
    }
    
    modifier validContentId(uint256 _contentId) {
        require(_contentId > 0 && _contentId < nextContentId, "Invalid content ID");
        _;
    }
    
    modifier contentExists(uint256 _contentId) {
        require(contentProofs[_contentId].timestamp > 0, "Content does not exist");
        _;
    }
    
    // =================== Constructor ===================
    
    constructor() {
        owner = msg.sender;
        authorizedVerifiers[msg.sender] = true;
    }
    
    // =================== Core Functions ===================
    
    /**
     * @dev Register new content for verification
     */
    function registerContent(
        bytes32 _contentHash,
        string memory _ipfsHash,
        address _author
    ) external returns (uint256) {
        require(_contentHash != bytes32(0), "Invalid content hash");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(_author != address(0), "Invalid author address");
        require(hashToContentId[_contentHash] == 0, "Content already registered");
        
        uint256 contentId = nextContentId++;
        
        contentProofs[contentId] = ContentProof({
            contentHash: _contentHash,
            ipfsHash: _ipfsHash,
            author: _author,
            timestamp: block.timestamp,
            blockNumber: block.number,
            isVerified: false,
            verificationScore: 0,
            verificationMethods: new string[](0),
            verifier: address(0)
        });
        
        hashToContentId[_contentHash] = contentId;
        authorContent[_author].push(contentId);
        
        emit ContentRegistered(contentId, _contentHash, _author, _ipfsHash);
        return contentId;
    }
    
    /**
     * @dev Request verification for content
     */
    function requestVerification(uint256 _contentId) 
        external 
        payable 
        validContentId(_contentId) 
    {
        require(msg.value >= verificationFee, "Insufficient verification fee");
        require(verificationRequests[_contentId].requester == address(0), "Verification already requested");
        
        verificationRequests[_contentId] = VerificationRequest({
            contentId: _contentId,
            requester: msg.sender,
            fee: msg.value,
            isPaid: true,
            isProcessed: false,
            requestTime: block.timestamp,
            deadline: block.timestamp + verificationDeadline
        });
        
        emit VerificationRequested(nextRequestId++, _contentId, msg.sender);
    }
    
    /**
     * @dev Perform content verification (only authorized verifiers)
     */
    function verifyContent(
        uint256 _contentId,
        uint8 _score,
        string[] memory _methods
    ) external onlyVerifier validContentId(_contentId) {
        require(_score <= 100, "Score must be 0-100");
        require(_methods.length > 0, "At least one verification method required");
        
        ContentProof storage proof = contentProofs[_contentId];
        require(!proof.isVerified, "Content already verified");
        
        VerificationRequest storage request = verificationRequests[_contentId];
        require(request.isPaid, "Verification not paid");
        require(block.timestamp <= request.deadline, "Verification deadline passed");
        
        proof.isVerified = _score >= minimumScore;
        proof.verificationScore = _score;
        proof.verificationMethods = _methods;
        proof.verifier = msg.sender;
        
        request.isProcessed = true;
        
        // Pay verifier (90% of fee, 10% to contract)
        uint256 verifierPayment = (request.fee * 90) / 100;
        payable(msg.sender).transfer(verifierPayment);
        
        emit VerificationCompleted(_contentId, proof.isVerified, _score, msg.sender);
    }
    
    /**
     * @dev Submit evidence for content dispute
     */
    function submitEvidence(
        uint256 _contentId,
        string memory _evidenceType,
        string memory _evidenceData
    ) external validContentId(_contentId) {
        require(bytes(_evidenceType).length > 0, "Evidence type required");
        require(bytes(_evidenceData).length > 0, "Evidence data required");
        
        Evidence memory newEvidence = Evidence({
            contentId: _contentId,
            submitter: msg.sender,
            evidenceType: _evidenceType,
            evidenceData: _evidenceData,
            timestamp: block.timestamp,
            isValid: false // Requires manual review
        });
        
        contentEvidence[_contentId].push(newEvidence);
        
        emit EvidenceSubmitted(_contentId, msg.sender, _evidenceType);
    }
    
    /**
     * @dev Raise dispute against content verification
     */
    function raiseDispute(uint256 _contentId) 
        external 
        payable 
        validContentId(_contentId) 
    {
        require(msg.value >= verificationFee * 2, "Insufficient dispute fee");
        require(contentProofs[_contentId].isVerified, "Content not verified yet");
        
        // Reset verification status pending dispute resolution
        contentProofs[_contentId].isVerified = false;
        
        emit DisputeRaised(_contentId, msg.sender);
    }
    
    // =================== Verification Methods ===================
    
    /**
     * @dev Check if content hash matches IPFS content
     */
    function verifyIPFSIntegrity(uint256 _contentId) 
        external 
        view 
        validContentId(_contentId) 
        returns (bool) 
    {
        // This would integrate with IPFS in a real implementation
        // For now, return true if basic checks pass
        ContentProof memory proof = contentProofs[_contentId];
        return bytes(proof.ipfsHash).length > 0 && proof.contentHash != bytes32(0);
    }
    
    /**
     * @dev Check for duplicate content
     */
    function checkDuplicateContent(bytes32 _contentHash) 
        external 
        view 
        returns (bool exists, uint256 existingContentId) 
    {
        uint256 contentId = hashToContentId[_contentHash];
        return (contentId != 0, contentId);
    }
    
    /**
     * @dev Validate timestamp authenticity
     */
    function validateTimestamp(uint256 _contentId) 
        external 
        view 
        validContentId(_contentId) 
        returns (bool) 
    {
        ContentProof memory proof = contentProofs[_contentId];
        return proof.timestamp <= block.timestamp && proof.blockNumber <= block.number;
    }
    
    // =================== Query Functions ===================
    
    /**
     * @dev Get content verification details
     */
    function getContentVerification(uint256 _contentId) 
        external 
        view 
        validContentId(_contentId) 
        returns (
            bytes32 contentHash,
            string memory ipfsHash,
            address author,
            bool isVerified,
            uint8 score,
            string[] memory methods,
            address verifier
        ) 
    {
        ContentProof memory proof = contentProofs[_contentId];
        return (
            proof.contentHash,
            proof.ipfsHash,
            proof.author,
            proof.isVerified,
            proof.verificationScore,
            proof.verificationMethods,
            proof.verifier
        );
    }
    
    /**
     * @dev Get all content by author
     */
    function getContentByAuthor(address _author) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return authorContent[_author];
    }
    
    /**
     * @dev Get evidence for content
     */
    function getContentEvidence(uint256 _contentId) 
        external 
        view 
        validContentId(_contentId) 
        returns (Evidence[] memory) 
    {
        return contentEvidence[_contentId];
    }
    
    /**
     * @dev Get verification statistics
     */
    function getVerificationStats() 
        external 
        view 
        returns (
            uint256 totalContent,
            uint256 verifiedContent,
            uint256 pendingVerifications,
            uint256 totalVerifiers
        ) 
    {
        uint256 verified = 0;
        uint256 pending = 0;
        
        for (uint256 i = 1; i < nextContentId; i++) {
            if (contentProofs[i].isVerified) {
                verified++;
            } else if (verificationRequests[i].isPaid && !verificationRequests[i].isProcessed) {
                pending++;
            }
        }
        
        return (nextContentId - 1, verified, pending, getVerifierCount());
    }
    
    // =================== Admin Functions ===================
    
    /**
     * @dev Set DRManager contract address
     */
    function setDRManagerContract(address _drManager) external onlyOwner {
        require(_drManager != address(0), "Invalid contract address");
        drManagerContract = _drManager;
    }
    
    /**
     * @dev Authorize/deauthorize verifier
     */
    function setVerifierStatus(address _verifier, bool _authorized) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[_verifier] = _authorized;
        emit VerifierAuthorized(_verifier, _authorized);
    }
    
    /**
     * @dev Update verification fee
     */
    function setVerificationFee(uint256 _fee) external onlyOwner {
        verificationFee = _fee;
    }
    
    /**
     * @dev Update minimum verification score
     */
    function setMinimumScore(uint8 _score) external onlyOwner {
        require(_score <= 100, "Score must be 0-100");
        minimumScore = _score;
    }
    
    /**
     * @dev Validate evidence
     */
    function validateEvidence(uint256 _contentId, uint256 _evidenceIndex, bool _isValid) 
        external 
        onlyOwner 
        validContentId(_contentId) 
    {
        require(_evidenceIndex < contentEvidence[_contentId].length, "Invalid evidence index");
        contentEvidence[_contentId][_evidenceIndex].isValid = _isValid;
    }
    
    /**
     * @dev Emergency withdrawal
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // =================== Helper Functions ===================
    
    function getVerifierCount() private view returns (uint256) {
        // This is a simplified count - in reality, you'd maintain a separate counter
        return 1; // At least the owner is a verifier
    }
    
    /**
     * @dev Check if address is authorized verifier
     */
    function isAuthorizedVerifier(address _address) external view returns (bool) {
        return authorizedVerifiers[_address];
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // =================== Integration with DRManager ===================
    
    /**
     * @dev Called by DRManager to verify content before licensing
     */
    function isContentVerified(uint256 _contentId) 
        external 
        view 
        validContentId(_contentId) 
        returns (bool verified, uint8 score) 
    {
        ContentProof memory proof = contentProofs[_contentId];
        return (proof.isVerified, proof.verificationScore);
    }
    
    /**
     * @dev Batch verification status check
     */
    function batchVerificationStatus(uint256[] memory _contentIds) 
        external 
        view 
        returns (bool[] memory verified, uint8[] memory scores) 
    {
        verified = new bool[](_contentIds.length);
        scores = new uint8[](_contentIds.length);
        
        for (uint256 i = 0; i < _contentIds.length; i++) {
            if (_contentIds[i] > 0 && _contentIds[i] < nextContentId) {
                ContentProof memory proof = contentProofs[_contentIds[i]];
                verified[i] = proof.isVerified;
                scores[i] = proof.verificationScore;
            }
        }
        
        return (verified, scores);
    }
} 