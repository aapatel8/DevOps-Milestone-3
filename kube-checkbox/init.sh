#!/bin/bash
source ./vars/env_variables.sh
ansible-playbook -i inventory main.yml
