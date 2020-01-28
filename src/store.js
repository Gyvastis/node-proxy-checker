const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const accessKeyId = process.argv[2] !== undefined ? process.argv[2] : null;
const secretAccessKey = process.argv[3] !== undefined ? process.argv[3] : null;
console.log(accessKeyId, secretAccessKey)
const BUCKET_NAME = 'handyproxy-proxies';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  sslEnabled: true,
  accessKeyId,
  secretAccessKey
});

const uploadFile = (filePath, bucketFileName) => {
  let fileContents = fs.readFileSync(filePath);

  s3.upload({
    Bucket: BUCKET_NAME,
    Key: bucketFileName,
    Body: fileContents
  }, (err, data) => {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
};

uploadFile('./output/output.json', 'proxies.json')
