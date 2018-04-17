#!/bin/sh

cd /var/lib/jenkins/workspace/postBuild/
npm install
node mainDOITrust2.js
ansible-playbook -i inventoryITrust postBuildITrust2.yml
