var fs = require('fs')
var lineReader = require('readline').createInterface({
  input: fs.createReadStream('/var/lib/jenkins/workspace/postBuild/inventory'),
});

var logger = fs.createWriteStream('main.js', {
  	flags: 'a'
  });

logger.write("\nvar nodeServers = [ ");
var count = 1;
var start = false;
lineReader.on('line', function (line) {
	if(line == '[main]'){
		start = true;
	}
	else{
		if(start == true){
			stuff = line.split(" ");
			ip = stuff[0];
	    	console.log('Line from file:', ip);
	    	logger.write('\n{url:"http://' + ip + ':8080/iTrust2", latency: 0},');
	    	count++;
	    	if(count > 5){
	    		console.log("end");
				logger.write("\n]; ");
				return;
	    	}
    	}
    }
});
