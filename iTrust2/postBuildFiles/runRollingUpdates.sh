#!/bin/sh

cd /var/lib/jenkins/workspace/Monitoring
npm install
node read_inv.js
node main.js
cd /var/lib/jenkins/workspace/Monitoring/www
http-server
cd /var/lib/jenkins/workspace/postBuild
ansible-playbook -i inventoryITrust rolling_update.yml
