#!/bin/sh

cd /var/lib/jenkins/workspace/postBuild/
npm install
node mainDOCheckbox.js
ansible-playbook -i inventoryCheckbox setEnvVarsStable.yml
ansible-playbook -i inventoryCheckbox postBuildCheckbox.yml  # -l Checkbox
