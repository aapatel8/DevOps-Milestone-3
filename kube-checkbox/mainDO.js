var needle = require("needle");
var os   = require("os");
var sleep   = require("sleep");
var exec = require('ssh-exec');

var fs = require('fs');

var config = {};
config.token = process.env.DO_TOKEN;
config.sshKeyId = process.env.DO_SSH_KEY_ID;
config.sshKeyPath = process.env.DO_SSH_KEY_PATH;

var masterIpFilePath = "vars/master_ip.yml";
var workerIpFilePath = "vars/worker_ips.yml";
var inventoryFilePath = "inventory";

var name = "scbutle2"+os.hostname();
var region = "nyc3"; // Fill one in from #1
var image = "ubuntu-16-04-x64"; // Fill one in from #2
var size = "s-2vcpu-2gb";
var dropletId = [];
var numNodes = 3;
var numMaster = 1;
var masterIp;
var nodesWritten = 0;
var dropInfo = 0;
var headers =
{
	'Content-Type':'application/json',
	Authorization: 'Bearer ' + config.token
};

var client =
{
	createDroplet: function (dropletName, region, imageName, onResponse)
	{
		var data = 
		{
			"name": dropletName,
			"region":region,
			"size":size,
			"image":imageName,
			// Id to ssh_key already associated with account.
			"ssh_keys":[config.sshKeyId],
			"backups":false,
			"ipv6":false,
			"user_data":null,
			"private_networking":null
		};

            //console.log("Attempting to create: "+ JSON.stringify(data) );

		needle.post("https://api.digitalocean.com/v2/droplets", data, {headers:headers,json:true}, onResponse );
	},

	getDropletInfo: function(dropletId, onResponse)
	{
		needle.get("https://api.digitalocean.com/v2/droplets/" + dropletId, {headers:headers}, onResponse);
	}
};

function callGetDropletInfo() {
    client.getDropletInfo(dropletId[dropInfo++], function(error, response) {
        var ip = response.body["droplet"]["networks"]["v4"][0]["ip_address"];
        console.log("IP address is " + ip);
        
        logger.write(`${ip} ansible_ssh_user=root ansible_ssh_private_key_file=${config.sshKeyPath}\n`);

        nodesWritten++;

        if ( nodesWritten > numMaster ) {
            workerIpFile.write(`worker${workerCnt++}: ${ip}\n`);
        }

        if ( nodesWritten == numNodes ) {
            logger.end();
            
            var masterIpFile = fs.createWriteStream(masterIpFilePath, { flags: 'w' });
            masterIpFile.write(`---\nmaster_ip: ${masterIp}\n`);

            masterIpFile.end();
            workerIpFile.end();

        } else if ( nodesWritten == numMaster ) {
            masterIp = ip; 
            logger.write("[workers]\n");
        } 

    });
}

var workerIpFile = fs.createWriteStream(workerIpFilePath, { flags: 'w' });

var logger = fs.createWriteStream(inventoryFilePath, {
    flags: 'w' // 'a' means appending (old data will be preserved)
});
var workerCnt = 1;

logger.write("[master]\n");

for( var nodesCreated = 0; nodesCreated < numNodes; nodesCreated++) {

    var name = "kube-node-" + nodesCreated;
    client.createDroplet(name, region, image, function(err, resp, body)
    {
        //console.log(body);
        // StatusCode 202 - Means server accepted request.
        if(!err && resp.statusCode == 202)
        {
                //console.log( JSON.stringify( body, null, 3 ) );
            dropletId.push(body["droplet"]["id"]);
            //console.log("Droplet id is " + dropletId[nodesWritten]);
        }
    });

    setTimeout(callGetDropletInfo, 40000);
}


