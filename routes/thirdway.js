const express = require('express');
const router = express.Router();
const util = require('util');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const aws = require('aws-sdk');

const ACCEPTED_EXTENSIONS = ['.wma', '.m4a', '.mp3', '.wav']

const S3_BUCKET = 'timdose-research-tw001';

var s3Folder = moment().format('YYYY-MM-DD');

const VARIATION_DATA = {
  a: {
    surveyID: 'tw001-a',
    imageVariation: 'madecasse'
  },
  b: {
    surveyID: 'tw001-b',
    imageVariation: 'madecas'
  }
}

//---------------------------------------------
// File upload setup
//---------------------------------------------

const storage = multer.diskStorage({
  filename: function(req, file, callback ) {
    callback(null, file.originalname)
  }
})

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, callback) {
    // console.log(callback.toString());
    var extension = path.extname(file.originalname);
    if ( ACCEPTED_EXTENSIONS.indexOf( extension ) < 0 ) {
      req.uploadHasBadExtension = true;
      return callback(null, false);
    }

    return callback(null, true);
  },
  onError: function(err, next) {
    console.log(err);
    console.log('err');
    next();
  }
})

//---------------------------------------------
// AWS setup
//---------------------------------------------

aws.config.region = 'us-east-1';
const s3 = new aws.S3();


//---------------------------------------------
// Routes
//---------------------------------------------


/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('tw001', {fields:{}, validation:{}, surveyID: 'tw001.01A', imageVariation: 'madecasse' });
// });

router.get('/tw001-a', getHome );
router.get('/tw001-b', getHome );
router.post('/', upload.single('audioFile'), postHome );
router.post('/tw001-a', upload.single('audioFile'), postHome );
router.post('/tw001-b', upload.single('audioFile'), postHome );

function getHome( req, res, next ) {
  var variation = req.path.split('-')[1];
  var variationData = VARIATION_DATA[variation];
  res.render('tw001', {
    fields:{}, 
    validation:{}, 
    surveyID: variationData.surveyID, 
    imageVariation: variationData.imageVariation 
  }); 
}

function postHome( req, res, next ) {
  console.log('\n\n*********************************\n')
  console.log(util.inspect(req.body, false, null));
  console.log('\n\n*********************************\n')
  console.log(util.inspect(req.file, false, null));

  var validation = {}
  var isComplete = true;

  if (req.body.workerID == '' ) {
    validation.workerID = 'WORKER_ID_EMPTY';
    isComplete = false;
  }

  if (req.body.confidence == '' || req.body.confidence === undefined ) {
    validation.confidence = 'CONFIDENCE_EMPTY';
    isComplete = false;
  }

  if (req.file === undefined ) {
    validation.audioFile = 'FILE_EMPTY';
    isComplete = false;
  }

  if (req.uploadHasBadExtension === true ) {
    validation.audioFile = "FILE_WRONG_TYPE";
    isComplete = false;
  }

  if (isComplete) {
    handleAudioFileUpload(req.body, req.file);
    handleTextFileUpload(req.body, req.file, req.ip);
    console.log('here');
    res.redirect('/thank-you');
  } else {
    res.render('tw001', {fields: req.body, validation: validation});    
  }
}


function handleAudioFileUpload(fields, file) {
  var variationFolder = fields.surveyID;
  var dateFolder = moment().format('YYYY-MM-DD');
  var filename = fields.workerID + path.extname(file.originalname)
  const keyName = [variationFolder, dateFolder, filename].join('/')
  var params = {
    Bucket: S3_BUCKET,
    Key: keyName,
    Body: fs.createReadStream(file.path)
  };

  s3.putObject(params, function (err, res) {
    if (err) {
      console.log("Error uploading data: ", err);
    } else {
      console.log("Successfully uploaded data to " + S3_BUCKET + "/" + keyName);
    }
  });

}


function handleTextFileUpload(fields, file, ip) {
  var variationFolder = fields.surveyID;
  var dateFolder = moment().format('YYYY-MM-DD');
  var filename = fields.workerID + '.txt';
  const keyName = [variationFolder, dateFolder, filename].join('/')

  var results = {};
  for ( var attr in fields ) {
    results[attr] = fields[attr];
  }
  for ( var attr in file ) {
    results[attr] = file[attr];
  }
  results.timestamp = moment().format('YYYY-MM-DD HH:mm:ss Z')
  results.ip = ip;
  console.log('**FINAL DATA: ' + util.inspect(results));

  var body = JSON.stringify(results);

  var params = {
    Bucket: S3_BUCKET, 
    Key: keyName, 
    Body: body
  };

  s3.putObject(params, function(err, data) {
    if (err)
      console.log("Error uploading data: ", err);
    else
      console.log("Successfully uploaded data to " + S3_BUCKET + "/" + keyName);
  });
}


router.get('/thank-you', function(req, res, next) {
  res.render('confirm');
});


module.exports = router;
