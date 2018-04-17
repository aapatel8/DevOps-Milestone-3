var http = require('http');
var request = require('request');
var os = require('os');

var exec = require('child_process').exec;

// websocket server that website connects to.
var io = require('socket.io')(3000);

var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
/// CHILDREN nodes

function memoryLoad()
{
     var memory = os.totalmem() - os.freemem();
     console.log( os.totalmem(), os.freemem() );
    return ((memory/os.totalmem())*100).toFixed(2);
}

// Create function to get CPU information
function cpuTicksAcrossCores()
{
  //Initialise sum of idle and time of cores and fetch CPU info
  var totalIdle = 0, totalTick = 0;
  var cpus = os.cpus();

  //Loop through CPU cores
  for(var i = 0, len = cpus.length; i < len; i++)
  {
        //Select CPU core
        var cpu = cpus[i];
        //Total up the time in the cores tick
        for(type in cpu.times)
        {
            totalTick += cpu.times[type];
        }
        //Total up the idle time of the core
        totalIdle += cpu.times.idle;
  }

  //Return the average Idle and Tick times
  return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
}

var startMeasure = cpuTicksAcrossCores();

function cpuAverage()
{
    var endMeasure = cpuTicksAcrossCores();

    //Calculate the difference in idle and total time between the measures
    var idleDifference = endMeasure.idle - startMeasure.idle;
    var totalDifference = endMeasure.total - startMeasure.total;

    //Calculate the average percentage CPU usage

    return (((totalDifference-idleDifference)/totalDifference)*100).toFixed(2);
}

function measureLatenancy(server)
{
    var options =
    {
        url: server.url,
        proxy: proxy.url
    };
    console.log("request to url");
    request(options, function (error, res, body)
    {
        console.log( error || res.statusCode, server.url);
        if(error){
            server.latency = 10000;
            return;
        }
        server.latency = 500; //replace 500 with start and end time of request and response
    });
    return server.latency;
}

function calculateColor()
{
    // latency scores of all nodes, mapped to colors.
    var nodes = nodeServers.map( measureLatenancy ).map( function(latency)
    {
        var color = "#cccccc";
        if( !latency )
            return {color: color};
        if( latency == 10000 )
        {
            color = "#cccccc";
        }
        else if( latency > 1000 )
        {
            color = "#ff0000";
        }
        else if( latency > 20 )
        {
            color = "#cc0000";
        }
        else if( latency > 15 )
        {
            color = "#ffff00";
        }
        else if( latency > 10 )
        {
            color = "#cccc00";
        }
        else if( latency > 5 )
        {
            color = "#00cc00";
        }
        else
        {
            color = "#00ff00";
        }
        console.log( latency );
        return {color: color};
    });
    //console.log( nodes );
    return nodes;
}


io.on('connection', function (socket) {
    console.log("Received connection");

    ///////////////
    //// Broadcast heartbeat over websockets
    //////////////
    // var heartbeatTimer = setInterval( function ()
    // {
    //  var data = {
    //      name: "Your Computer", cpu: cpuAverage(), memoryLoad: memoryLoad()
    //      ,nodes: calculateColor()
    //  };
    //  console.log("interval", data)
    //  //io.sockets.emit('heartbeat', data );
    //  socket.emit("heartbeat", data);
    // }, 5000);

    var heartbeatTimer = setInterval( function ()
    {
        io.sockets.emit('heartbeat',
        {
            name: "Your Computer", cpu: cpuAverage(), memoryLoad: memoryLoad(),
            nodes: calculateColor()
       });

    }, 2000);

    socket.on('disconnect', function () {
        console.log("closing connection")
        clearInterval(heartbeatTimer);
    });
});

var nodeServers = [
    {url:"http://104.236.111.206:8080/iTrust2", latency: 0},
    {url:"http://104.131.74.222:8080/iTrust2", latency: 0},
    {url:"http://104.236.79.5:8080/iTrust2", latency: 0},
    {url:"http://104.131.65.210:8080/iTrust2", latency: 0},
    {url:"http://104.131.177.149:8080/iTrust2", latency: 0}
]