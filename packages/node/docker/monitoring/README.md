
# Monitoring

This directory is to use prometheus and grafana to build monitoring for subql node.

## Subql Node Dashboards

### Bootstrap

There is a docker compose file, start a subql node to index data to postgres, and use prometheus to collect indicators and grafana for visual display.

To get started, run this command to launch the containers:  
`$ docker compose up`


Until each container is up and running, we can access the web interface of each service.

-   `localhost:3000`: subql node(access the path `/metrics` to view current indicators)
-   `localhost:5432`: is accessible for postgres connections 
-   `localhost:9090`: prometheus web ui
-   `localhost:3001`: grafana dashboard

### View dashboard

Open a browser to access `ocalhost:3001/dashboards` and select `subql-node-dashboard` to browse the monitoring indicators of subql node
![subql node dashbard](imgs/subql-node-dashboard.png?raw=true)

### License

Apache-2.0