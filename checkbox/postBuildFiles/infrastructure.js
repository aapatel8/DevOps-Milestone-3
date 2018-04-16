var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request");
var heartbeats = require('heartbeats');

var heart = heartbeats.createHeart(1000);

var STABLE = //'http://104.236.62.220';
var CANARY = //'http://104.131.25.235';

var TARGET = STABLE;

var unhealthy = false;

var infrastructure =
{
  setup: function()
  {
    // Proxy.
    var options = {};
    var proxy   = httpProxy.createProxyServer(options);

    var server  = http.createServer(function(req, res)
    {
      // Creates random number from 1 to 100
      var randomnumber = Math.floor((Math.random() * 100) + 1);
      // Routes 30% traffic to canary version and remaining to stable version
      if (unhealthy){
        TARGET = STABLE;
      }
      else{
        if(randomnumber <=30){
          TARGET = CANARY;
        } else {
          TARGET = STABLE;
        }
      }
      proxy.web( req, res, {target: TARGET } );
    });
    server.listen(80);

    // Check the status of canary server each 5 seconds
    heart.createEvent(5, function(heartbeat, last){
      request(CANARY + ':3002/api/study/listing', function (error, res, body) {
          if (!error)
          {
            console.log('STATUS of CANARY: ' + res.statusCode);
            // If the status is 500 it means that cpu usage is high so routes all the traffic to stable server
            if (res.statusCode == 500)
            {
              unhealthy = true;
              console.log('500 Error - High CPU Usage');
            } else
            {
              // When cpu usage of canary server goes down again, loadbalancer starts to send traffic to that again
              unhealthy = false;
              console.log('Canary server is healthy');
            }
          }
          else {
            console.log("error: ", error)
          }
      });
    });
  },

  teardown: function()
  {
    exec('forever stopall', function()
    {
      console.log("infrastructure shutdown");
      process.exit();
    });
  },
}

infrastructure.setup();

// Make sure to clean up.
process.on('exit', function(){infrastructure.teardown();} );
process.on('SIGINT', function(){infrastructure.teardown();} );
process.on('uncaughtException', function(err){
  console.error(err);
  infrastructure.teardown();} );
