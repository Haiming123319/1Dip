import { create } from '@web3-storage/w3up-client';
import { filesFromPaths } from 'files-from-path';

async function uploadToIPFS(filePath) {
  const client = await create();

  await client.login('weiqingzuo@163.com');

  // Use your space DID to set the current space
  const spaceDid = 'did:key:z6Mkkjd65KSLqaceC9VASqy8JN9sX3r1ZKMJLoGSg2Y1TQbj';
  await client.setCurrentSpace(spaceDid);

  const files = await filesFromPaths([filePath]);
  console.log('files:', files);

  const cid = await client.uploadDirectory(files);

  console.log('Uploaded successfully, CID:', cid.toString());
  return cid.toString();
}

export { uploadToIPFS };