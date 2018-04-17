var needle = require("needle");
var os   = require("os");

var sleep   = require("sleep");

var exec = require('ssh-exec');

var fs = require('fs');

var config = {};
config.token = process.env.DOTOKEN;
config.sshKeyId = process.env.DOSSHID;
console.log("Your token is:", config.token);

var instanceCount = 0;

var headers =
{
	'Content-Type':'application/json',
	Authorization: 'Bearer ' + config.token
};

// Documentation for needle:
// https://github.com/tomas/needle

var client =
{
	createDroplet: function (dropletName, region, imageName, onResponse)
	{
		var data =
		{
			"name": dropletName,
			"region":region,
			"size":"1gb",
			"image":imageName,
			// Id to ssh_key already associated with account.
			"ssh_keys":[config.sshKeyId],
			//"ssh_keys":null,
			"backups":false,
			"ipv6":false,
			"user_data":null,
			"private_networking":null
		};

		console.log("Attempting to create: "+ JSON.stringify(data) );

		needle.post("https://api.digitalocean.com/v2/droplets", data, {headers:headers,json:true}, onResponse );
	},

	getDropletInfo: function(dropletId, onResponse)
	{
		needle.get("https://api.digitalocean.com/v2/droplets/" + dropletId, {headers:headers}, onResponse)
	}
};

var region = "nyc3"; // Fill one in from #1
var image = "ubuntu-16-04-x64"; // Fill one in from #2
var dropletIds = [];
for (var i = 0; i < 5; i++) {
	var name = "aapatel8"+os.hostname() + "i";
	client.createDroplet(name, region, image, function(err, resp, body)
	{
		console.log(body);
		// StatusCode 202 - Means server accepted request.
		if(!err && resp.statusCode == 202)
		{
			//console.log( JSON.stringify( body, null, 3 ) );
			dropletIds[i] = body["droplet"]["id"];
			console.log("Droplet id is " + dropletIds[i]);
		}
	});
}

var ip = "";

setTimeout(callGetDropletInfo, 30000);

function callGetDropletInfo() {
	client.getDropletInfo(dropletIds[instanceCount++], function(error, response) {
		ip = response.body["droplet"]["networks"]["v4"][0]["ip_address"];
		console.log("IP address is " + ip);

		sleep.sleep(30);

		exec('sudo apt-get update && sudo apt-get -y install python', {
			user: 'root',
			host: ip,
			key: '/var/lib/jenkins/.ssh/id_rsa'
		}, function (err, stdout, stderr) {
			console.log(err, stdout, stderr)})
			.pipe(process.stdout);

		var logger = fs.createWriteStream('inventoryITrust', {
			flags: 'a' // 'a' means appending (old data will be preserved)
		});

		if (instanceCount == 0) {
			logger.write("[iTrust]\n");
		}
		logger.write(ip + " ansible_ssh_user=root " + "ansible_ssh_private_key_file=/var/lib/jenkins/.ssh/id_rsa\n");

		logger.end();

		console.log("Everything worked!");
	});
}
