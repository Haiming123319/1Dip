import { uploadToIPFS } from './upload.js';

const path = '/Users/ruth/Desktop/test.txt';

async function test() {
  try {
    console.log('Start uploading files...');
    const cid = await uploadToIPFS(path);
    console.log('Uploaded successfully, CID:', cid);
  } catch (err) {
    console.error('Upload failed:', err);
  }
}

test();
