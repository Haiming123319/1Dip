const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadToIPFS, calculateHash, registerWorkOnChain } = require('./upload');

require('dotenv').config();
const app = express();
const PORT = 3000;
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const buffer = fs.readFileSync(filePath);

        const hash = calculateHash(buffer);
        const cid = await uploadToIPFS(filePath);
        const title = req.body.title || "Untitled";

        await registerWorkOnChain(hash, title, cid);

        fs.unlinkSync(filePath);
        res.json({ hash, cid });
    } catch (err) {
        console.error(err);
        res.status(500).send('Upload failed');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
