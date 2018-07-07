/* eslint-disable no-param-reassign,camelcase*/
import { EventEmitter } from 'events';
import { Socket } from 'net';
import { parse } from 'url';
import { TLSSocket } from 'tls';
import {
  errors,
  constants,
  commands,
  tlvs,
  tlvsById,
  commandsById,
} from './defs';
import { PDU } from './pdu';

class Session extends EventEmitter {
  constructor(options) {
    super(options);
    // EventEmitter.call(this);
    this.options = options || {};
    let transport = new Socket();
    this.sequence = 0;
    this.paused = false;
    this._busy = false;
    this._callbacks = [];
    if (options.socket) {
      this.socket = options.socket;
    } else {
      if (options.tls) {
        transport = new TLSSocket();
      }
      // check to instantiate a new socket object

      this.socket = transport.connect(this.options);
      this.socket.on('connect', () => {
        this.emit('connect');
      });
      this.socket.on('secureConnect', () => {
        this.emit('secureConnect');
      });
    }
    this.socket.on('readable', this._extractPDUs.bind(this));
    this.socket.on('close', () => {
      // set the callbacks to empty
      this._callbacks = [];
      // emit the network close to subscribers
      this.emit('close');
    });
    this.socket.on('error', (e) => {
      this.emit('error', e);
    });
  }
  connect() {
    this.sequence = 0;
    this.paused = false;
    this._busy = false;
    this._callbacks = [];
    this.socket.connect(this.options);
  }
  // read data from the stream. check if _busy can be remove without impacting the flow of data
  _extractPDUs() {
    if (this._busy) {
      return;
    }
    this._busy = true;
    let pdu;
    while (!this.paused) {
      try {
        pdu = PDU.fromStream(this.socket);
        if (!pdu) {
          break;
        }
      } catch (e) {
        this.emit('error', e);
        return;
      }
      this.emit('pdu', pdu);
      this.emit(pdu.command, pdu);
      if (pdu.isResponse() && this._callbacks[pdu.sequence_number]) {
        this._callbacks[pdu.sequence_number](pdu);
        delete this._callbacks[pdu.sequence_number];
      }
    }
    this._busy = false;
  }
  send(pdu, responseCallback, sendCallback) {
    if (!this.socket.writable) {
      return false;
    }
    if (!pdu.isResponse()) {
      // when server/session pair is used to proxy smpp
      // traffic, the sequence_number will be provided by
      // client otherwise we generate it automatically
      if (!pdu.sequence_number) {
        if (this.sequence === 0x7fffffff) {
          this.sequence = 0;
        }
        pdu.sequence_number = ++this.sequence;
      }
      if (responseCallback) {
        this._callbacks[pdu.sequence_number] = responseCallback;
      }
    } else if (responseCallback && !sendCallback) {
      sendCallback = responseCallback;
    }
    this.socket.write(pdu.toBuffer(), () => {
      this.emit('send', pdu);
      if (sendCallback) {
        sendCallback(pdu);
      }
    });
    return true;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this._extractPDUs();
  }
  close(callback) {
    if (callback) {
      this.socket.once('close', callback);
    }
    this.socket.end();
  }
}

const createShortcut = function(command) {
  return function(options, responseCallback, sendCallback) {
    if (typeof options === 'function') {
      sendCallback = responseCallback;
      responseCallback = options;
      options = {};
    }
    const pdu = new PDU(command, options);
    return this.send(pdu, responseCallback, sendCallback);
  };
};

// verify if prototype can be added to class object
for (const command of Object.keys(commands)) {
  Session.prototype[command] = createShortcut(command);
}
// exports.createSession  is removed. use connect
export const connect = (url, listener) => {
  let options = {};

  if (typeof url === 'string') {
    options = parse(url);
    options.host = options.slashes ? options.hostname : url;
    options.tls = options.protocol === 'ssmpp:';
  } else if (typeof url === 'function') {
    listener = url;
  } else {
    options = url || {};
    if (options.url) {
      url = parse(options.url);
      options.host = url.hostname;
      options.port = url.port;
      options.tls = url.protocol === 'ssmpp:';
    }
  }
  options.port = options.port || (options.tls ? 3550 : 2775);

  const session = new Session(options);
  if (listener) {
    // session.on(options.tls ? 'secureConnect' : 'connect', listener);
  }

  return session;
};

export const addCommand = (command, options) => {
  options.command = command;
  commands[command] = options;
  commandsById[options.id] = options;
  Session.prototype[command] = createShortcut(command);
};

export const addTLV = (tag, options) => {
  options.tag = tag;
  tlvs[tag] = options;
  tlvsById[options.id] = options;
};

export { Session };
export { PDU };

// for (const key of Object.keys(defs)) {
//   exports[key] = defs[key];
// }
for (const error of Object.keys(errors)) {
  exports[error] = errors[error];
}
for (const key of Object.keys(constants)) {
  exports[key] = constants[key];
}
