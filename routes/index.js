var express = require('express');
var router = express.Router();
fs = require('fs');
var csvparse = require('csv-parse');
var path = require('path');

const cwd = process.cwd();

/* GET home page. */
router.get('/', function(req, res, next) {
  var airportCsvPath = path.join(__dirname, '/../public/', 'airports.csv');

  fs.readFile(airportCsvPath,'utf8', (err,csvdata) => {
    if(err) throw err;
          csvparse(csvdata, (err, output) => {
            res.render('index',
                { title: 'Express',
                    airportData : output
            });

          });
      });



});

module.exports = router;
