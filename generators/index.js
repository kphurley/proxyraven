const fs = require('fs');
const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const archiver = require('archiver');
// eslint-disable-next-line camelcase
const { card_file, card_printing } = require('../database/models');

const TEMP_IMG_PATH = './tmp/images/';

// This is where we need to grab the high quality images from for downloading
// This should be somewhere in Digital Ocean instead of Azure
const IMAGE_BASE_DIR = `${process.env.SPACES_URL}/`;

function cmToPt(cm) {
  return cm * 28.3464566929134;
}

const cardWidth = 6.299;
const cardHeight = 8.788;
const cardWidthPt = cmToPt(cardWidth);
const cardHeightPt = cmToPt(cardHeight);
let progress;

function fileDoesNotExists(path, onExistsMsg, job, progressIncrement) {
  try {
    if (!fs.existsSync(path)) {
      return true;
    }
    console.error(onExistsMsg);
    // job.log(onExistsMsg);
    progress += progressIncrement;
    job.progress(progress);
  } catch (err) {
    console.error(err);
  }
  return false;
}

async function getFileNames(cardList, includeCardBacks, generateType, lmPlacementType = 'fit') {
  const cardFiles = cardList.map((card) => ({ front: card.url }));
  if (includeCardBacks) {
    return cardFiles
      .reduce((acc, filename) => (acc.concat([filename.front, filename.back])), [])
      .filter((filename) => (filename !== ''));
  }
  return cardFiles
    .map((filename) => (filename.front))
    .filter((filename) => (filename !== ''));
}

async function downloadFiles(fileNames, job, progressIncrement) {
  const delay = (ms) => (
    new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    })
  );

  const retryFetch = (url, fetchOptions = {}, retries = 3, retryDelay = 1000) => (
    new Promise((resolve, reject) => {
      const wrapper = (n) => {
        fetch(url, fetchOptions)
          .then((res) => { resolve(res); })
          .catch(async (err) => {
            if (n > 0) {
              console.log(`retry ${n} for ${url}`);
              await delay(retryDelay);
              wrapper(n - 1);
            } else {
              reject(err);
            }
          });
      };
      wrapper(retries);
    })
  );

  if (!fs.existsSync(TEMP_IMG_PATH)) { fs.mkdirSync(TEMP_IMG_PATH, { recursive: true }); }
  const promises = fileNames.map(async (fileName) => {
    // Assign only the part of the filename after the last slash
    // This allows us to pass full urls in for testing
    console.log('filename', fileName);
    const parts = fileName.split('/');
    const adjustedFileName = parts[parts.length - 1];
    const filePath = TEMP_IMG_PATH + adjustedFileName;
    // const url = IMAGE_BASE_DIR + fileName;
    const url = fileName;
    const imgRes = await retryFetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error downloading: ${fileName}`);
        }
        console.log(`Downloaded ${fileName}`);
        // job.log(`Downloaded ${fileName}`);
        progress += progressIncrement;
        job.progress(progress);
        return res;
      })
      .catch(console.error);
    const fileStream = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
      imgRes.body.pipe(fileStream);
      imgRes.body.on('error', (err) => {
        reject(err);
      });
      fileStream.on('finish', () => {
        resolve();
      });
    });
  });
  await Promise.all(promises);
}

function drawCutLines(doc, leftMargin, topMargin) {
  doc.lineWidth(0.5);
  // draw top lines
  let x = cardWidthPt + leftMargin;
  let y = topMargin;
  doc.moveTo(x, y)
    .lineTo(x, y - 10)
    .stroke();
  x += cardWidthPt;
  doc.moveTo(x, y)
    .lineTo(x, y - 10)
    .stroke();

  // draw lines between row 1 and 2
  x = leftMargin;
  y += cardHeightPt;
  doc.moveTo(x, y)
    .lineTo(x - 18, y)
    .stroke();
  x += 3 * cardWidthPt;
  doc.moveTo(x, y)
    .lineTo(x + 18, y)
    .stroke();

  // draw lines between row 2 and 3
  x = leftMargin;
  y += cardHeightPt;
  doc.moveTo(x, y)
    .lineTo(x - 18, y)
    .stroke();
  x += 3 * cardWidthPt;
  doc.moveTo(x, y)
    .lineTo(x + 18, y)
    .stroke();

  // draw bottom lines
  x = cardWidthPt + leftMargin;
  y += cardHeightPt;
  doc.moveTo(x, y)
    .lineTo(x, y + 10)
    .stroke();
  x += cardWidthPt;
  doc.moveTo(x, y)
    .lineTo(x, y + 10)
    .stroke();
}

function drawFullCutLines(doc, leftMargin, topMargin) {
  doc.lineWidth(0.75);
  const greyStroke = '#818181';

  // draw vertical lines
  let x = cardWidthPt + leftMargin;
  let y = 0;
  doc.moveTo(x, y)
    .lineTo(x, y + 1000)
    .stroke(greyStroke);
  x += cardWidthPt;
  doc.moveTo(x, y)
    .lineTo(x, y + 1000)
    .stroke(greyStroke);

  // draw horizontal lines
  x = 0;
  y = cardHeightPt + topMargin;
  doc.moveTo(x, y)
    .lineTo(x + 1000, y)
    .stroke(greyStroke);
  y += cardHeightPt;
  doc.moveTo(x, y)
    .lineTo(x + 1000, y)
    .stroke(greyStroke);
}

function makeFrontPage(doc, pageSize) {
  doc.moveDown(15);
  doc.fontSize(20);
  doc.text('Generated by Proxy Raven', {
    align: 'center',
  });
  doc.moveDown(3);
  doc.fontSize(14);
  doc.text(`Print this PDF on ${pageSize} paper, at 100% size with no additional margins.`, {
    align: 'center',
  });
  doc.moveDown(20);
  doc.fontSize(12);
  doc.text(`Generated on: ${new Date().toString()}`, {
    align: 'left',
  });
  doc.addPage();
}

function addImages(lst, doc, leftMargin, topMargin, fullCutLines, job, progressIncrement) {
  let rowCount = 0;
  let colCount = 0;

  for (let i = 0, n = lst.length; i < n; i += 1) {
    const { isPlot, url } = lst[i];
    console.log('raw url', url);
    const parts = url.split('/');
    const adjustedFileName = parts[parts.length - 1];
    const imgPath = TEMP_IMG_PATH + adjustedFileName;
    const x = rowCount * cardWidthPt + leftMargin;
    const y = colCount * cardHeightPt + topMargin;

    if (isPlot) {
      doc.save();
      doc.rotate(90, { origin: [x, y] });
      doc.image(imgPath, x, y - cardWidthPt, { width: cardHeightPt, height: cardWidthPt });
    } else {
      doc.image(imgPath, x, y, { width: cardWidthPt, height: cardHeightPt });
    }

    rowCount += 1;

    if (isPlot) {
      doc.restore();
    }

    console.log(`Added ${imgPath} to PDF`);
    // job.log(`Added ${code} to PDF`);
    progress += progressIncrement;
    job.progress(progress);

    if (rowCount > 2) {
      rowCount = 0;
      colCount += 1;
    }
    if (i === lst.length - 1) {
      if (fullCutLines) {
        drawFullCutLines(doc, leftMargin, topMargin);
      } else {
        drawCutLines(doc, leftMargin, topMargin);
      }
    }
    if (colCount > 2 && i < lst.length - 1) {
      colCount = 0;
      if (fullCutLines) {
        drawFullCutLines(doc, leftMargin, topMargin);
      } else {
        drawCutLines(doc, leftMargin, topMargin);
      }
      doc.addPage();
    }
  }
}

async function generatePdf(job, hash) {
  const {
    cardList,
    includeCardBacks,
    PdfPageSize,
    fullCutLines,
    requestID,
  } = job.data;
  const pdfFileName = `${hash}.pdf`;

  progress = 0;
  const fileNames = await getFileNames(cardList, includeCardBacks, 'pdf');

  const progressIncrement = 45 / fileNames.length;
  const fileNamesToDownload = fileNames.filter((fileName) => {
    const filePath = TEMP_IMG_PATH + fileName;
    const onExistsMsg = `Found cached copy of ${fileName}, don't download`;
    return fileDoesNotExists(filePath, onExistsMsg, job, progressIncrement);
  });

  job.log('Fetching images...');
  try {
    await downloadFiles(fileNamesToDownload, job, progressIncrement);
  } catch (err) {
    console.error(err);
    // TODO cancel job, inform client
  }

  job.log('Adding images to pdf...');
  job.progress(50);

  let leftMargin;
  let topMargin;
  if (PdfPageSize === 'A4') {
    leftMargin = 30;
    topMargin = 46;
  } else if (PdfPageSize === 'Letter') {
    leftMargin = 36;
    topMargin = 21;
  }
  const pdfPath = `./tmp/${pdfFileName}`;
  const doc = new PDFDocument({
    size: PdfPageSize,
    margins: {
      top: topMargin,
      bottom: topMargin,
      left: leftMargin,
      right: leftMargin,
    },
  });

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);
  try {
    makeFrontPage(doc, PdfPageSize);
  } catch (e) {
    console.log('ERROR MAKING FRONT PAGE?!');
    console.log(e);
  }

  addImages(cardList, doc, leftMargin, topMargin, fullCutLines, job, progressIncrement);
  doc.end();

  await new Promise((resolve) => {
    writeStream.on('finish', () => {
      resolve();
    });
  });

  return {
    filepath: pdfPath,
    hash,
    requestID,
  };
}

async function setRedPixel(originalPath, dupPath, index, completeMsg, job, progressIncrement) {
  return new Promise((resolve, reject) => {
    sharp(originalPath)
      .composite([{
        input: './tmp/images/red_dot.png', blend: 'over', top: index, left: 0,
      }])
      .jpeg({ quality: 98 })
      .toFile(dupPath)
      .then(() => {
        console.log(completeMsg);
        progress += progressIncrement;
        job.progress(progress);
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject();
      });
  });
}

async function generateMpc(job, hash) {
  const {
    cardList,
    includeCardBacks,
    LmMpcPlacement,
    requestID,
  } = job.data;
  const zipFileName = `${hash}.zip`;
  const zipPath = `./tmp/${zipFileName}`;
  const zipDir = `./tmp/${hash}/`;

  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
  }

  progress = 0;
  job.log('Fetching images...');

  const fileNames = await getFileNames(cardList, includeCardBacks, 'mpc', LmMpcPlacement);

  const imgCounts = {};
  fileNames.forEach((fileName) => {
    if (fileName in imgCounts) {
      if (imgCounts[fileName].count < 99) {
        imgCounts[fileName].count += 1;
      }
    } else {
      imgCounts[fileName] = { count: 1 };
    }
  });

  const downloadCount = Object.keys(imgCounts).length;
  const downloadProgressIncrement = 50 / (downloadCount + 4);
  const duplicateCount = Object.values(imgCounts).reduce((acc, val) => (acc + (val.count - 1)), 0);
  const duplicateProgressIncrement = 20 / duplicateCount;
  const zippingCount = Object.values(imgCounts).reduce((acc, val) => (acc + val.count), 0) + 5;
  const zippingProgressIncrement = 25 / zippingCount;

  const thronesCardBackUrl = 'https://swlcg-card-images.nyc3.cdn.digitaloceanspaces.com/00_CARD-BACK.tif';

  try {
    await downloadFiles([thronesCardBackUrl], job, downloadProgressIncrement);
  } catch (err) {
    console.log('Error fetching extra files!');
    console.error(err);
  }
  // }

  const fileNamesToDownload = Object.keys(imgCounts).filter((fileName) => {
    const filePath = TEMP_IMG_PATH + fileName;
    const onExistsMsg = `Found cached copy of ${fileName}, don't download`;
    return fileDoesNotExists(filePath, onExistsMsg, job, downloadProgressIncrement);
  });

  try {
    await downloadFiles(fileNamesToDownload, job, downloadProgressIncrement);
  } catch (err) {
    console.log('Error fetching images!');
    console.error(err);
  }

  const dupFiles = [];
  const processedRedPixels = [];
  job.log('Preparing images...');
  console.log('Creating duplicate copies...');
  for (let i = 0; i < Object.keys(imgCounts).length; i += 1) {
    const fileName = Object.keys(imgCounts)[i];
    const { count } = imgCounts[fileName];
    const parts = fileName.split('/');
    const adjustedFileName = parts[parts.length - 1];
    const splitName = adjustedFileName.split('.');
    for (let j = 1; j < count; j += 1) {
      const dupName = `${splitName[0]}-${j}.${splitName[1]}`;
      const imgPath = TEMP_IMG_PATH + dupName;
      const onExistsMsg = `Found ${dupName}, a cached copy of ${fileName}, don't duplicate`;

      dupFiles.push(dupName);
      if (fileDoesNotExists(imgPath, onExistsMsg, job, duplicateProgressIncrement)) {
        const originalImg = TEMP_IMG_PATH + adjustedFileName;
        const msg = `Duplicating ${fileName} to ${dupName}`;
        processedRedPixels.push(
          setRedPixel(originalImg, imgPath, j, msg, job, duplicateProgressIncrement),
        );
      }
    }
  }
  await Promise.all(processedRedPixels);
  console.log('Duplicates Ready');

  const allFiles = fileNames.concat(dupFiles);
  allFiles.forEach((fileName) => {
    const parts = fileName.split('/');
    const adjustedFileName = parts[parts.length - 1];
    const filePath = TEMP_IMG_PATH + adjustedFileName;
    fs.copyFileSync(filePath, `${zipDir}/${adjustedFileName}`);
  });

  job.log('Adding images to zip file...');
  console.log('Adding images to zip file...');

  const zipFileStream = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { lib: { level: 0 } });

  await new Promise((resolve) => {
    archive.pipe(zipFileStream);
    archive.on('error', (err) => { console.log(err); });
    archive.on('progress', () => {
      progress += zippingProgressIncrement;
      job.progress(progress);
    });
    archive.directory(zipDir, false);
    archive.file(`${TEMP_IMG_PATH}00_CARD-BACK.tif`, { name: '00_CARD-BACK.tif' });

    archive.finalize();
    zipFileStream.on('close', () => {
      job.log(`Zip file ready, ${archive.pointer()} total bytes`);
      resolve();
    });
  });
  return {
    filepath: zipPath,
    hash,
    requestID,
  };
}

module.exports.generatePdf = generatePdf;
module.exports.generateMpc = generateMpc;
