var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/thank-you', function(req, res, next) {
  res.render('confirm');
});

module.exports = router;
