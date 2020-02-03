const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  BUCKET_NAME
} = require('./secrets');

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  sslEnabled: true,
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY
});

const uploadFile = (filePath, bucketFileName) => {
  let fileContents = fs.readFileSync(filePath);

  s3.upload({
    Bucket: BUCKET_NAME,
    Key: bucketFileName,
    Body: fileContents,
    ACL:'public-read'
  }, (err, data) => {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
};

uploadFile('./output/output.json', 'proxies.json')
