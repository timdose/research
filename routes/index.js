var express = require('express');
var router = express.Router();
const util = require('util');
const multer = require('multer');
const path = require('path');

const ACCEPTED_EXTENSIONS = ['.wma', '.m4a', '.mp3', '.wav', '.png']

function test(blah) {
  return blah + 20;
}

const upload = multer({ 
  dest: 'tmp/',
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

var aws = require('aws-sdk');

aws.config.region = 'us-east-1';
const S3_BUCKET = 'timdose-research';
// const S3_BUCKET = process.env.S3_BUCKET;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {fields:{}, validation:{} });
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

  if (isComplete) {
    handleUpload(req.body, req.file);
    res.redirect('/thank-you');
  } else {
    res.render('index', {fields: req.body, validation: validation});    
  }
});


function handleUpload() {

}

router.get('/sign-s3', function(req, res, next){
    console.log('*********BUCKET: ' + process.env.S3_BUCKET)
    const s3 = new aws.S3();
      const fileName = req.query['file-name'];
      const fileType = req.query['file-type'];
      const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Expires: 60,
        ContentType: fileType,
        ACL: 'public-read'
      };

      s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if(err){
          console.log(err);
          return res.end();
        }
        const returnData = {
          signedRequest: data,
          url: 'https://${S3_BUCKET}.s3.amazonaws.com/${fileName}'
        };
        res.write(JSON.stringify(returnData));
        res.end();
      });
});

router.get('/thank-you', function(req, res, next) {
  res.render('confirm');
});


module.exports = router;
