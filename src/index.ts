import docker from './lib/docker';
import etcd from './lib/etcd';

async function onContainerUp(container) {
  return etcd.addContainer(container);
}

async function onContainerDown(container) {
  return etcd.removeContainer(container);
}

async function start() {
  await etcd.init();
  await docker.init(onContainerUp);
  await docker.watch(
    onContainerUp,
    onContainerDown,
  );
}

start()
  .then(() => {
    console.info('Watching...');
  })
  .catch(console.error);

process.on('SIGHUP', () => {
  docker.init(onContainerUp)
    .then(() => {
      console.info('Reloaded docker entries in etcd');
    })
    .catch((err) => {
      console.error(`Failed to reload ${err.message}`);
    });
});

process.on('SIGINT', () => {
  docker.stop();
  console.info('Got SIGINT: Stopped watcher.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  docker.stop();
  docker.deleteSelf(onContainerDown)
    .then(() => {
      console.info('Got SIGTERM: Deleted all host data from etcd.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`Got SIGTERM: Failed to delete host data: ${err.message}`);
      process.exit(1);
    });
});

process.on('SIGUSR2', () => {
  Promise.resolve()
    .then(docker.stop)
    .then(etcd.deleteAll)
    .then(() => docker.init(onContainerUp))
    .then(() => docker.watch(onContainerUp, onContainerDown))
    .then(() => {
      console.info('Got SIGUSR2: Reloaded docker entries in etcd');
    })
    .catch((err) => {
      console.error(`Got SIGUSR2: Failed to reload all host data: ${err.message}`);
    });
});
