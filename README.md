# ec.service-registrator

> This service registers and updates running docker container into an etcd cluster.

## Running ec.service-registrator

Start is as a docker container in detached mode.

```sh
docker run -d \
  --name=registrator \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e EC_ETCD_HOSTS=localhost:2379 \
  -e EC_HOST=MyServerName \
  entrecode/service-registrator:latest
```

There are some actions you can perform while runnint ec.service-registrator. They are started by sending signals to the running container. For example:

```sh
docker kill -s=SIGHUP registrator
```

The following signals are supported:

* `SIGINT` - Will stop and exit registrator but leave etcd data untouched.

* `SIGTERM` - Will stop and exit registrator and will also delete the current data from this host in etcd.

* `SIGUSR2` - Will delete all data from etcd and reload everything afterwards. Important: Will delete all data from other registrator containers running on different hosts.

* `SIGHUP` - Will reinitialize all data in etcd. Can be used to reinitialise the data if an other running registrator got the signal `SIGUSR2`.

## Config

* `EC_REGISTRATOR_DOCKER_SOCKET` (/var/run/docker.sock)

  overwrite path to docker socket

* `EC_REGISTRATOR_ETCD_HOSTS` (localhost:2379)

  overwrite host and port for etcd cluster

* `EC_REGISTRATOR_ETCD_CERT` (undefined)

  set path to certificate for client authentication

* `EC_REGISTRATOR_ETCD_CA` (undefined)

  set path to chain file for client authentication

* `EC_REGISTRATOR_ETCD_KEY` (undefined)

  set path to key file for client authentication

* `EC_REGISTRATOR_ETCD_DIR` (registry)

  overwrite directory name in etcd

* `EC_REGISTRATOR_HOST` (undefined)

  set host name under which containers are sorted in etcd

## Etcd Format

```txt
/registry/containers/${Id}/id = ${Id}
                          /created = ${Created}
                          /state = ${State}
                          /image = ${Config.Image}
                          /name = ${Name}
                          /labels/${label} = ${value}
                                 /${label} = ${value}
                                 …

                          /network/ip = ${NetworkSettings.IPAddress}
                                  /ports/${NetworkSettings.Ports[0]}/intPort = ${NetworkSettings.Ports[0]}
                                                                    /extPort = ${NetworkSettings.Ports[0].HostPort}
                                                                    /extIp = ${NetworkSettings.Ports[0].HostIp}
                                                                    /proto = UDP or TCP
                                        /${NetworkSettings.Ports[1]}/intPort = ${NetworkSettings.Ports[1]}
                                                                    …
                                        …

         /hosts/${host}/{Name} = ${Id}
                       /{Name} = ${Id}
                       …

               /${host}/{Name} = ${Id}
                       /{Name} = ${Id}
                       …

         /labels/${label}/${Id} = ${value}
                         /${Id} = ${value}
                         …
```
