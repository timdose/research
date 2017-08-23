var express = require('express');
var router = express.Router();
const util = require('util');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const ACCEPTED_EXTENSIONS = ['.wma', '.m4a', '.mp3', '.wav']

const S3_BUCKET = 'timdose-research-tw001';
const S3_FOLDER = '01';

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

var aws = require('aws-sdk');

aws.config.region = 'us-east-1';
// const S3_BUCKET = process.env.S3_BUCKET;
const s3 = new aws.S3();


//---------------------------------------------
// Routes
//---------------------------------------------


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('tw001', {fields:{}, validation:{} });
});

router.post('/', upload.single('audioFile'), function(req, res, next) {
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
});

function handleAudioFileUpload(fields, file) {
  const keyName = S3_FOLDER + '/' + fields.workerID + path.extname(file.originalname);
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
  var keyName = S3_FOLDER + '/' + fields.workerID + '.txt';

  var results = {};
  for ( var attr in file ) {
    results[attr] = file[attr];
  }
  for ( var attr in fields ) {
    results[attr] = fields[attr];
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
