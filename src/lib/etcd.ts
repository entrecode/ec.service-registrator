import * as config from 'config';
import * as Etcd from 'node-etcd';
import { promisify } from 'util';
import { create } from 'domain';

const etcdHosts: string = config.get('etcd.hosts');
const etcdOpts: any = {
  maxRetries: 3,
};

if (config.has('etcd.cert')) {
  etcdOpts.cert = config.get('etcd.cert');
  etcdOpts.ca = config.get('etcd.ca');
  etcdOpts.key = config.get('etcd.key');
}

const etcd = new Etcd(etcdHosts.split(',').map(x => x.trim()), etcdOpts);
etcd.mkdirAsync = promisify(etcd.mkdir);
etcd.setAsync = promisify(etcd.set);
etcd.delAsync = promisify(etcd.del);

async function init() {
  try {
    const dir = await etcd.mkdirAsync(config.get('etcd.dir'));
    console.debug(`etcd: created dir '${config.get('etcd.dir')}'`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }

    console.debug(`etcd: dir '${config.get('etcd.dir')}' already exists. Send SIGUSR2 to reinitialise.`);
  }
}

async function createDirectories(id) {
  try {
    await etcd.mkdirAsync(`${config.get('etcd.dir')}/containers/${id}`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }
  }

  try {
    await etcd.mkdirAsync(`${config.get('etcd.dir')}/containers/${id}/network`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }
  }

  try {
    await etcd.mkdirAsync(`${config.get('etcd.dir')}/containers/${id}/network/ports`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }
  }

  try {
    await etcd.mkdirAsync(`${config.get('etcd.dir')}/hosts`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }
  }

  try {
    await etcd.mkdirAsync(`${config.get('etcd.dir')}/labels`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }
  }
}

async function addContainer(container) {
  await createDirectories(container.Id);

  const containerNode = {
    id: container.Id,
    created: container.Created,
    state: container.State.Status,
    image: container.Config.Image,
    name: container.Name.substr(1),
    host: config.get('host'),
  };

  await Promise.all(Object.keys(containerNode).map(async property =>
    etcd.setAsync(
      `${config.get('etcd.dir')}/containers/${container.Id}/${property}`,
      containerNode[property],
    )));

  await etcd.setAsync(`${config.get('etcd.dir')}/hosts/${config.get('host')}/${containerNode.name}`, containerNode.id);

  try {
    await etcd.mkdirAsync(`${config.get('etcd.dir')}/containers/${container.Id}/labels`);
  } catch (err) {
    if (err.errorCode !== 102) {
      throw err;
    }
  }

  await Promise.all(Object.keys(container.Config.Labels).map(async (label) => {
    await etcd.setAsync(
      `${config.get('etcd.dir')}/containers/${container.Id}/labels/${label}`,
      container.Config.Labels[label],
    );
    await etcd.setAsync(
      `${config.get('etcd.dir')}/labels/${label}/${container.Id}`,
      container.Config.Labels[label],
    );
  }));

  await etcd.setAsync(
    `${config.get('etcd.dir')}/containers/${container.Id}/network/ip`,
    container.NetworkSettings.IPAddress,
  );

  await Promise.all(Object.keys(container.NetworkSettings.Ports).map(async (port) => {
    const [portNo, proto] = port.split('/');
    const portInfo = container.NetworkSettings.Ports[port];

    const portNode: any = {
      proto,
      intPort: portNo,
      extPort: portInfo ? portInfo[0].HostPort : null,
      extIp: portInfo ? portInfo[0].HostIp : null,
    };

    await Promise.all(Object.keys(portNode).map(async property =>
      etcd.setAsync(
        `${config.get('etcd.dir')}/containers/${container.Id}/network/ports/${port.replace('/', '-')}/${property}`,
        portNode[property],
      )));
  }));

  console.info(`Added container ${containerNode.name}`);
}

async function removeContainer(container) {
  await etcd.delAsync(
    `${config.get('etcd.dir')}/hosts/${config.get('host')}/${container.Name.substr(1)}`,
    { recursive: true },
  );

  await Promise.all(Object.keys(container.Config.Labels).map(async label =>
    etcd.delAsync(`${config.get('etcd.dir')}/labels/${label}/${container.Id}`, { recursive: true })));

  await etcd.delAsync(`${config.get('etcd.dir')}/containers/${container.Id}`, { recursive: true });

  console.info(`Remove container ${container.Name.substr(1)}`);
}

async function deleteAll() {
  await etcd.delAsync(`${config.get('etcd.dir')}/`, { recursive: true });
}

export default {
  init,
  addContainer,
  removeContainer,
  deleteAll,
};
