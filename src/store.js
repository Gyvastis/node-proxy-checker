const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const accessKeyId = process.argv[2] !== undefined ? process.argv[2] : null;
const secretAccessKey = process.argv[3] !== undefined ? process.argv[3] : null;
const BUCKET_NAME = 'handyproxy-proxies';

const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  sslEnabled: true,
  accessKeyId,
  secretAccessKey
});

const uploadFile = (filePath, bucketFileName) => {
  let fileContents = fs.readFileSync(fileName);

  s3.upload({
    Bucket: BUCKET_NAME,
    Key: bucketFileName,
    Body: JSON.parse()
  }, (err, data) => {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
};

uploadFile('./output/output.json', 'proxies.json')
