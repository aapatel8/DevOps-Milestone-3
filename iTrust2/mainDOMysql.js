var needle = require("needle");
var os   = require("os");

var sleep   = require("sleep");

var exec = require('ssh-exec');

var fs = require('fs');

var config = {};
config.token = process.env.DOTOKEN;
config.sshKeyId = process.env.DOSSHID;

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
			"size":"4gb",
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

var name = "mysql"+os.hostname();
var region = "nyc3"; // Fill one in from #1
var image = "ubuntu-16-04-x64"; // Fill one in from #2
var dropletId = "";
client.createDroplet(name, region, image, function(err, resp, body)
{
	console.log(body);
	// StatusCode 202 - Means server accepted request.
	if(!err && resp.statusCode == 202)
	{
		//console.log( JSON.stringify( body, null, 3 ) );
		dropletId = body["droplet"]["id"];
		console.log("Droplet id is " + dropletId);
	}
});

var ip = "";

setTimeout(callGetDropletInfo, 30000);

function callGetDropletInfo() {
	client.getDropletInfo(dropletId, function(error, response) {
		ip = response.body["droplet"]["networks"]["v4"][0]["ip_address"];
		console.log("IP address is " + ip);

		sleep.sleep(30);

		exec('sudo apt-get update && sudo apt-get -y install python', {
			user: 'root',
			host: ip,
		}, function (err, stdout, stderr) {
			console.log(err, stdout, stderr)})
			.pipe(process.stdout);

		fs.unlink("roles/iTrust2Build/templates/hibernate.properties.template")
		fs.writeFileSync("roles/iTrust2Build/templates/hibernate.properties.template", 'hibernate.connection.url = jdbc:mysql://' + ip + ':3306/iTrust2?createDatabaseIfNotExist=true\n');
		fs.appendFileSync("roles/iTrust2Build/templates/hibernate.properties.template", 'hibernate.connection.username = {{mysql_user}}\n');
		fs.appendFileSync("roles/iTrust2Build/templates/hibernate.properties.template", 'hibernate.connection.password = {{mysql_password}}\n');

		fs.unlink("roles/iTrust2Droplets/templates/hibernate.properties.template")
		fs.writeFileSync("roles/iTrust2Droplets/templates/hibernate.properties.template", 'hibernate.connection.url = jdbc:mysql://' + ip + ':3306/iTrust2?createDatabaseIfNotExist=true\n');
		fs.appendFileSync("roles/iTrust2Droplets/templates/hibernate.properties.template", 'hibernate.connection.username = {{mysql_user}}\n');
		fs.appendFileSync("roles/iTrust2Droplets/templates/hibernate.properties.template", 'hibernate.connection.password = {{mysql_password}}\n');
		var logger = fs.createWriteStream('inventory', {
			flags: 'w'
		});

		logger.write("[mysql]\n" + ip + " ansible_ssh_user=root " + "ansible_ssh_private_key_file=/Users/akshitpatel/.ssh/id_rsa\n");

		logger.end();

		sleep.sleep(30);

		console.log("Everything worked!");
	});
}
