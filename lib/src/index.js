"use strict";

exports.__esModule = true;
exports.Session = exports.addTLV = exports.addCommand = exports.connect = void 0;

var _events = require("events");

var _net = require("net");

var _url = require("url");

var _tls = require("tls");

var _defs = require("./defs");

exports.types = _defs.types;

var _pdu = require("./pdu");

exports.PDU = _pdu.PDU;

class Session extends _events.EventEmitter {
  constructor(options) {
    super(options);
    this.options = options || {};
    let transport = new _net.Socket();
    this.sequence = 0;
    this.paused = false;
    this._busy = false;
    this._callbacks = [];

    if (options.socket) {
      this.socket = options.socket;
    } else {
      if (options.tls) {
        transport = new _tls.TLSSocket();
      }

      if (options.timeout) {
        this.socket.socket.setTimeout(options.timeout);
      }

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
      this._callbacks = [];
      this.emit('close');
    });
    this.socket.on('error', e => {
      this.emit('error', e);
    });
    this.socket.on('timeout', () => {
      this.emit('timeout', 'Socket timeout');
    });
  }

  connect() {
    this.sequence = 0;
    this.paused = false;
    this._busy = false;
    this._callbacks = [];
    this.socket.connect(this.options);
  }

  _extractPDUs() {
    if (this._busy) {
      return;
    }

    this._busy = true;
    let pdu;

    while (!this.paused) {
      try {
        pdu = _pdu.PDU.fromStream(this.socket);

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

exports.Session = Session;

const createShortcut = function (command) {
  return function (options, responseCallback, sendCallback) {
    if (typeof options === 'function') {
      sendCallback = responseCallback;
      responseCallback = options;
      options = {};
    }

    const pdu = new _pdu.PDU(command, options);
    return this.send(pdu, responseCallback, sendCallback);
  };
};

for (const command of Object.keys(_defs.commands)) {
  Session.prototype[command] = createShortcut(command);
}

const connect = (url, listener) => {
  let options = {};

  if (typeof url === 'string') {
    options = (0, _url.parse)(url);
    options.host = options.slashes ? options.hostname : url;
    options.tls = options.protocol === 'ssmpp:';
  } else if (typeof url === 'function') {
    listener = url;
  } else {
    options = url || {};

    if (options.url) {
      url = (0, _url.parse)(options.url);
      options.host = url.hostname;
      options.port = url.port;
      options.tls = url.protocol === 'ssmpp:';
    }
  }

  options.port = options.port || (options.tls ? 3550 : 2775);
  const session = new Session(options);

  if (listener) {}

  return session;
};

exports.connect = connect;

const addCommand = (command, options) => {
  options.command = command;
  _defs.commands[command] = options;
  _defs.commandsById[options.id] = options;
  Session.prototype[command] = createShortcut(command);
};

exports.addCommand = addCommand;

const addTLV = (tag, options) => {
  options.tag = tag;
  _defs.tlvs[tag] = options;
  _defs.tlvsById[options.id] = options;
};

exports.addTLV = addTLV;

for (const error of Object.keys(_defs.errors)) {
  exports[error] = _defs.errors[error];
}

for (const key of Object.keys(_defs.constants)) {
  exports[key] = _defs.constants[key];
}
//# sourceMappingURL=index.js.map