# csc519-cm-deployment
Project prompt: https://github.com/CSC-DevOps/Course/blob/master/Project/M3.md#milestone-deployment

Repository for our groups Deployment Milestone

## Contributions

| Team Member   | Unity ID | Contribution   
| ------------- | ----------- | ------------ 
| Seth Butler      | scbutle2 | Kubernetes  
| Akshit Patel     | aapatel8 | Deployment, Redis  
| Kunal Kulkarni | krkulkar | Rolling update  
| Rezvan Mahdavi Hezaveh  |  rmahdav |  Canary Release 

## Deployment
We have used Jenkins as the build server and created a droplet with Jenkins hosted on it. We created 1 droplet for hosting Mysql server for Itrust, and 5 droplets for iTrust in the production environment.

For checkbox we add `pre-push` hook to trigger a job on jenkins server when something is pushed to master branch. We demo it with canary release. We run an ansible playbook that creates an instance for mongodb and one instance for jenkins and two jobs that are triggered by using the `pre-push` hook.

Screencast - see Canary Release and Rolling Update below

## Infrastructure Upgrade
### Kubernetes
This component automatically creates DO droplets one of which is made into the master node for the kubernetes cluster and the others become worker nodes. The worker nodes run the checkbox io pods which are then served for public consumption. A service is created which automatically routes all traffic to the master (and any other nodes) IP on port 30000 to the checkbox pods that are running. One of the pods will be used to serve the request and return the checkbox page. Due to redundance even if a node were to go down the kubernetes cluster will automatically being redirecting traffic to the remaing nodes once it discovers that a node has failed.  
Screencast: https://youtu.be/VVVqoucDGzs

### Redis
Created 3 droplets with checkbox - one master and 2 slaves.
Edited routes/create.js - function createStudy() to check if myKey exists. If it doesn't, return error message. If it does, proceed with creating study.  
Originally myKey is nil, then myKey set to true from master node. Checkbox droplet containing slave redis is checked to see that study can be created.

Screencast: https://youtu.be/Z-aYObM_0fg

## Canary Release

We have two jobs on jenkins server. One of them is triggered by push on `master` branch and deploys checkbox on a Stable server. The other one is triggered by push on `canary` branch and deploys checkbox on a Canary server and also creates a Loadbalancer. Loadbalancer routes 30% of requests to the Canary server and the remainings to the Stable server. We changed the code of `server.js` so raise an alert when usage of cpu goes upper than 30%. In this situation Loadbalacer routes all the requests to the Stable server. We use `stress` to create high usage of cpu in Canary server. After falling down od cpu usage, Loadbalancer starts again to route 30% of requests to the Canary server.

To maintain the single instance of mongodb, we create a droplet and configure it using `MongoDB` role and pass the IP of it to Canary and Stable server. We also changed mongo config to accept requests from other ips instead of localhost which is its default. To do so, we replace `mongod.conf` file using template in our playbook.

Screencast: https://youtu.be/JZ7QuXM-R04 (including Checkbox.io deployment)

## Rolling Update
For the rolling update, we wrote a [playbook](https://github.ncsu.edu/scbutle2/csc519-cm-deployment/blob/deployment/iTrust2/postBuildFiles/rolling_update.yml) which runs as part of a Jenkins [job](https://github.ncsu.edu/scbutle2/csc519-cm-deployment/blob/deployment/iTrust2/iTrust2_rolling_update.xml) that is triggered by a git hook whenever a commit is made on the production branch of the source repo. The rolling update ensures that only 1 instance is redeployed at a time. We have done this using the [serial](https://github.ncsu.edu/scbutle2/csc519-cm-deployment/blob/deployment/iTrust2/postBuildFiles/rolling_update.yml#L5) parameter of Ansible. For the monitoring dashboard and heartbeat mechanism, we have extended the class workshop for monitoring, and created the [directory](https://github.ncsu.edu/scbutle2/csc519-cm-deployment/tree/deployment/iTrust2/Monitoring), which contains the [code](https://github.ncsu.edu/scbutle2/csc519-cm-deployment/blob/deployment/iTrust2/Monitoring/main.js) for that part. We are also inserting the IP addresses of the 5 created instances dynamically in the inventory for the rolling update playbook, with the help of [read_inv.js](https://github.ncsu.edu/scbutle2/csc519-cm-deployment/blob/deployment/iTrust2/Monitoring/read_inv.js)

Screencast: https://www.youtube.com/watch?v=h7sE3DOMo_s (including iTrust2 deployment)
