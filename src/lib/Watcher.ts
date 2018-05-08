import { EventEmitter } from 'events';

export default class Watcher extends EventEmitter {
  private stream: any;
  private docker: any;
  public running: boolean;

  constructor(docker) {
    super();
    this.docker = docker;
  }

  start() {
    this.running = true;
    this.docker.getEvents((err, stream) => {
      if (err) {
        this.emit('error', err);
      }

      this.emit('connect');

      stream.on('data', (chunk) => {
        try {
          const events = chunk.toString('utf8').trim().split('\n');
          events.forEach((eventString) => {
            const event = JSON.parse(eventString);
            // ignore exec_* events
            if (event.Action.indexOf('exec_') === -1) {
              console.log(event.Action);
              this.emit('event', event);
              this.emit(event.Action, event);
            }
          });
        } catch (e) {
          console.warn(`Unable to parse event: ${e.message}`);
        }
      });

      stream.on('end', () => {
        this.emit('disconnect');
        this.stream = null;

        if (this.running) {
          this.start();
        }
      });
    });

    return this;
  }

  stop() {
    this.running = false;

    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }

    return this;
  }
}
