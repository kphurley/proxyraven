const fs = require('fs');
const throng = require('throng');
const Queue = require('bull');
const crypto = require('crypto');
const { PutObjectCommand, S3 } = require('@aws-sdk/client-s3');
const { generatePdf, generateMpc } = require('./generators');
const { request } = require('./database/models');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const workers = process.env.WEB_CONCURRENCY || 1;
const maxJobsPerWorker = 1;

const s3Client = new S3({
  forcePathStyle: false,
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

async function cachedCopyExists(hash) {
  return request.count({ where: { hash, is_download_available: true } })
    .then((count) => (count !== 0));
}

function getHash(jobData) {
  const dataToHash = { ...jobData };
  delete dataToHash.sessionID;
  delete dataToHash.requestID;

  if (dataToHash.selectedTab === 'Card List') {
    delete dataToHash.selectedSet;
    delete dataToHash.playsetSelection;
    delete dataToHash.deckURLText;
  } else if (dataToHash.selectedTab === 'Set') {
    delete dataToHash.cardListTextArea;
    delete dataToHash.deckURLText;
  } else if (dataToHash.selectedTab === 'Decklist') {
    delete dataToHash.cardListTextArea;
    delete dataToHash.selectedSet;
    delete dataToHash.playsetSelection;
  }

  if (dataToHash.generateType === 'pdf') {
    delete dataToHash.LmMpcPlacement;
  } else if (dataToHash.generateType === 'mpc') {
    delete dataToHash.PdfPageSize;
    delete dataToHash.fullCutLines;
  }
  console.log(`Hashing new request with data: ${JSON.stringify(dataToHash)}`);
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(dataToHash))
    .digest('hex');
}

function start() {
  const workQueue = new Queue('work', REDIS_URL);
  workQueue.process(maxJobsPerWorker, async (job, done) => {
    let result;
    let generateFunc;
    let fileExtension;
    let contentType;
    const hash = getHash(job.data);
    console.log(`Starting request with hash ${hash}`);

    if (job.data.generateType === 'pdf') {
      generateFunc = generatePdf;
      fileExtension = '.pdf';
      contentType = 'application/pdf';
    } else if (job.data.generateType === 'mpc') {
      generateFunc = generateMpc;
      fileExtension = '.zip';
      contentType = 'application/zip';
    }

    if (await cachedCopyExists(hash)) {
      console.log('Found cached copy!');
      job.log('Found cached copy!');
      job.progress(95);
      result = {
        filepath: `./tmp/${hash}${fileExtension}`,
        hash,
        requestID: job.data.requestID,
      };
      done(null, result);
    } else {
      result = await generateFunc(job, hash);
      console.log('Uploading file to Spaces...');
      job.log('Uploading file to Spaces...');
      job.progress(95);

      const fileStream = fs.createReadStream(result.filepath);

      const params = {
        Bucket: 'raven-cdn',
        Key: `files/${hash}${fileExtension}`,
        Body: fileStream,
        ACL: 'public-read',
        ContentType: contentType,
      };

      const command = new PutObjectCommand(params);
      const data = await s3Client.send(command);

      done(null, { ...result, s3Response: data });
    }
  });
}

throng({ workers, start });
