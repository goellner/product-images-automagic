

const gulp = require('gulp');
const { series } = require('gulp');
const fs = require('fs');
const request = require('request');
const { exec } = require('child_process');
const im = require('imagemagick');
const dotenv = require('dotenv');

dotenv.config();


const nameMap = require("./name-map.json");

const basePaths = {
  src: './src/',
  renamed: './renamed/',
  withoutBG: './without-bg/',
  trimmed: './trimmed/',
  dist: './dist/',
};

const baseName = "whisky-web ";

function rename(cb) {
  nameMap.forEach(item => {
    if(item.image_1 !== "" && fs.existsSync(`${basePaths.src}${baseName}${item.flasche}.jpg`)) {
      fs.copyFileSync(`${basePaths.src}${baseName}${item.flasche}.jpg`, `${basePaths.renamed}${item.image_1}.jpg`)
    }
    if(item.image_2 !== "" && fs.existsSync(`${basePaths.src}${baseName}${item.verpackung}.jpg`)) {
      fs.copyFileSync(`${basePaths.src}${baseName}${item.verpackung}.jpg`, `${basePaths.renamed}${item.image_2}.jpg`);
    }
  });
  cb();
}
function loopImages(cb) {
  nameMap.forEach(item => {
    if(item.image_1 !== "" && fs.existsSync(`${basePaths.renamed}${item.image_1}.jpg`)) {
      if(!fs.existsSync(`${basePaths.withoutBG}${item.image_1}.png`)) {
        removeBg(`${item.image_1}`)
      }
    }
    if(item.image_2 !== "" && fs.existsSync(`${basePaths.renamed}${item.image_2}.jpg`)) {
      if(!fs.existsSync(`${basePaths.withoutBG}${item.image_2}.png`)) {
        removeBg(`${item.image_2}`)
      }
    }
  });
  cb();
}

function loopImagesTrim(cb) {
  nameMap.forEach(item => {
    console.log(`${basePaths.withoutBG}${item.image_1}.png`);
    if(item.image_1 !== "" && fs.existsSync(`${basePaths.withoutBG}${item.image_1}.png`)) {
      trimImage(`${item.image_1}`)
    }
    if(item.image_2 !== "" && fs.existsSync(`${basePaths.withoutBG}${item.image_2}.png`)) {
      trimImage(`${item.image_2}`)
    }
  });
  cb();
}

function loopImagesCompose(cb) {
  nameMap.forEach(item => {
    if(item.image_1 !== "" && item.image_2 !== "" && fs.existsSync(`${basePaths.trimmed}${item.image_1}.png`) && fs.existsSync(`${basePaths.trimmed}${item.image_2}.png`)) {
      compose(item)
    }
  });
  cb();
}

function removeBg(filename) {
  console.log("remove bg!");
  request.post({
    url: 'https://api.remove.bg/v1.0/removebg',
    formData: {
      image_file: fs.createReadStream(`${basePaths.renamed}${filename}.jpg`),
      size: 'auto',
    },
    headers: {
      'X-Api-Key': process.env.REMOVE_BG_API_KEY,
    },
    encoding: null
  }, function (error, response, body) {
    if (error) return console.error('Request failed:', error);
    if (response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
    fs.writeFileSync(`${basePaths.withoutBG}${filename}.png`, body);
  });
}

function trimImage(filename) {
  im.convert([`${basePaths.withoutBG}${filename}.png`, '-trim', '+repage', `./trimmed/${filename}.png`],
    function (err, stdout) {
      if (err) throw err;
      console.log('stdout:', stdout);
    });
}

function compose(item) {
  exec(`convert -size 3400x3400 xc:white ${basePaths.trimmed}${item.image_2}.png -gravity center -geometry +250-150 -composite ${basePaths.trimmed}${item.image_1}.png -gravity center -geometry -250-0 -composite ./${basePaths.dist}/${item.image_3}.png`, (err, stdout, stderr) => {
    if (err) {
      console.log(err);
    }
  });
}

const dev = gulp.series(rename);

exports.default = dev;
exports.rename = rename;
exports.removeBg = series(loopImages);
exports.trim = series(loopImagesTrim);
exports.compose = series(loopImagesCompose);
