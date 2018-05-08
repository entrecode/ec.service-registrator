import * as config from 'config';
import * as Docker from 'dockerode';
import { statSync } from 'fs';
import Watcher from './Watcher';

const stats = statSync(config.get('dockerSocket'));

if (!stats.isSocket()) {
  throw new Error('FATAL: Check docker socket and if docker is running');
}

const docker = new Docker({ socketPath: config.get('dockerSocket') });
let watcher;

async function init(onContainerUp) {
  const containers = await docker.listContainers();
  await containers
    .map(container => () => docker
      .getContainer(container.Id)
      .inspect()
      .then(container => onContainerUp(container)))
    .reduce((a, b) => a.then(b), Promise.resolve());
}

async function watch(onContainerUp, onContainerDown) {
  watcher = new Watcher(docker)
    .start()
    .on('error', console.error)
    .on('start', (event) => {
      docker
        .getContainer(event.id)
        .inspect()
        .then((container: any) => {
          if ('Health' in container.State && container.State.Health.Status !== 'healthy') {
            console.info('Start event for unhalthy container ignored');
            return;
          }

          return onContainerUp(container);
        });
    })
    .on('health_status: healthy', (event) => {
      docker
        .getContainer(event.id)
        .inspect()
        .then(container => onContainerUp(container));
    })
    .on('health_status: unhealthy', (event) => {
      try {
        // TODO only work with container id
        // TODO see if we have entries for this id
        // TODO load keys recursively and search for id, then delete keys with id in them
        docker
          .getContainer(event.id)
          .inspect()
          .then(container => onContainerDown(container));
      } catch (e) {
        // eat those errors - nom nom
      }
    })
    .on('die', (event) => {
      // TODO only work with container id
      // TODO see if we have entries for this id
      // TODO load keys recursively and search for id, then delete keys with id in them
      docker
        .getContainer(event.id)
        .inspect()
        .then(container => onContainerDown(container));
    });
}

function stop() {
  if (watcher) {
    watcher.stop();
    watcher = null;
  }
}

async function deleteSelf(onContainerDown) {
  const containers = await docker.listContainers();
  await containers
    .map(container => () => docker
      .getContainer(container.Id)
      .inspect()
      .then(container => onContainerDown(container)))
    .reduce((a, b) => a.then(b), Promise.resolve());
}

export default {
  init,
  watch,
  stop,
  deleteSelf,
};
