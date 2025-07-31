let contract;
let signer;

async function loadContract() {
    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask not detected. Please install MetaMask.");
        return;
    }

    try {
        console.log("Requesting MetaMask connection...");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();

        console.log("Connected account:", await signer.getAddress());

        const response = await fetch('contract.json');
        const contractData = await response.json();
        console.log("Contract JSON loaded:", contractData);

        const contractAddress = "0xBE334a4f3e51FEbA9A1C73B92ecC8cd095C9d0aC"; 
        const contractABI = contractData.abi;
        contract = new ethers.Contract(contractAddress, contractABI, signer);

        console.log("Contract initialized:", contract);
    } catch (err) {
        console.error("MetaMask connection failed:", err);
        alert("MetaMask connection failed: " + err.message);
    }
}


async function fileToHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function registerWork() {
    const file = document.getElementById("fileInput").files[0];
    const title = document.getElementById("titleInput").value;
    if (!file || !title) return alert("Missing inputs");
    const hash = await fileToHash(file);
    await loadContract();
    const tx = await contract.registerWork(hash, title, "placeholderCID");
    await tx.wait();
    document.getElementById("status").innerText = "Registered: " + hash;
}

async function createLicense() {
    const file = document.getElementById("fileInput2").files[0];
    const price = document.getElementById("priceInput").value;
    const hash = await fileToHash(file);
    const priceWei = ethers.utils.parseEther(price);
    await loadContract();
    const tx = await contract.createLicense(hash, priceWei, "General Use", "Global", 365 * 24 * 60 * 60);
    await tx.wait();
    document.getElementById("status").innerText = "License created: " + hash;
}

async function purchaseLicense() {
    const file = document.getElementById("fileInput3").files[0];
    const hash = await fileToHash(file);
    await loadContract();
    const lic = await contract.getLicense(hash);
    const tx = await contract.purchaseLicense(hash, { value: lic.price });
    await tx.wait();
    document.getElementById("status").innerText = "License purchased: " + hash;
}

window.addEventListener("load", async () => {
    await loadContract();
});

