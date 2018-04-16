#!/bin/sh

cd /var/lib/jenkins/workspace/postBuild/
npm install
node mainDOCanary.js
ansible-playbook -i inventoryCanary setEnvVarsCanary.yml
ansible-playbook -i inventoryCanary postBuildCanary.yml -l Canary

node mainDOLoadbalancer.js
ansible-playbook -i inventoryLoadbalancer postBuildLoadBalancer.yml
