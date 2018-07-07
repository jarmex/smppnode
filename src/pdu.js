/* eslint-disable no-param-reassign,camelcase,prefer-arrow-callback,space-before-function-paren*/
import { commands, commandsById, tlvs, tlvsById, errors } from './defs';

const pduHeadParams = [
  'command_length',
  'command_id',
  'command_status',
  'sequence_number',
];

class PDU {
  constructor(command, options = {}) {
    if (Buffer.isBuffer(command)) {
      return this.fromBuffer(command);
    }
    this.command = command;
    this.command_length = 0;
    this.command_id = commands[command].id;
    this.command_status = options.command_status || 0;
    this.sequence_number = options.sequence_number || 0;
    if (this.command_status) {
      return;
    }
    const params = commands[command].params || {};
    Object.keys(params).forEach((key) => {
      if (key in options) {
        this[key] = options[key];
      } else if ('default' in params[key]) {
        this[key] = params[key].default;
      } else {
        this[key] = params[key].type.default;
      }
    });

    Object.keys(options).forEach((key) => {
      if (key in tlvs) {
        this[key] = options[key];
      }
    });
  }
  isResponse() {
    return !!(this.command_id & 0x80000000);
  }
  response(option) {
    const options = option || {};
    options.sequence_number = this.sequence_number;
    if (this.command === 'unknown') {
      if (!('command_status' in options)) {
        options.command_status = errors.ESME_RINVCMDID;
      }
      return new PDU('generic_nack', options);
    }
    return new PDU(`${this.command}_resp`, options);
  }
  fromBuffer(buffer) {
    pduHeadParams.forEach(
      function(key, i) {
        this[key] = buffer.readUInt32BE(i * 4);
      }.bind(this),
    );
    let params;
    let offset = 16;
    if (this.command_length > PDU.maxLength) {
      throw Error(
        `PDU length was too large (${this.command_length}, maximum is ${
          PDU.maxLength
        }).`,
      );
    }
    if (commandsById[this.command_id]) {
      this.command = commandsById[this.command_id].command;
      params = commands[this.command].params || {};
    } else {
      this.command = 'unknown';
      return;
    }
    for (const key of Object.keys(params)) {
      if (offset >= this.command_length) {
        break;
      }
      this[key] = params[key].type.read(buffer, offset);
      offset += params[key].type.size(this[key]);
    }
    while (offset + 4 <= this.command_length) {
      const tlvId = buffer.readUInt16BE(offset);
      const length = buffer.readUInt16BE(offset + 2);
      offset += 4;
      const tlv = tlvsById[tlvId];
      if (!tlv) {
        this[tlvId] = buffer.slice(offset, offset + length);
        offset += length;
        continue; // eslint-disable-line
      }
      const tag = (commands[this.command].tlvMap || {})[tlv.tag] || tlv.tag;
      if (tlv.multiple) {
        if (!this[tag]) {
          this[tag] = [];
        }
        this[tag].push(tlv.type.read(buffer, offset, length));
      } else {
        this[tag] = tlv.type.read(buffer, offset, length);
      }
      offset += length;
    }
    this._filter('decode');
  }
  _filter(func) {
    const params = commands[this.command].params || {};
    for (const key of Object.keys(this)) {
      if (params[key] && params[key].filter) {
        this[key] = params[key].filter[func].call(this, this[key]);
      } else if (tlvs[key] && tlvs[key].filter) {
        if (tlvs[key].multiple) {
          this[key].forEach(
            function(value, i) {
              this[key][i] = tlvs[key].filter[func].call(this, value);
            }.bind(this),
          );
        } else {
          this[key] = tlvs[key].filter[func].call(this, this[key]);
        }
      }
    }
  }
  _initBuffer() {
    const buffer = new Buffer(this.command_length);
    pduHeadParams.forEach(
      function(key, i) {
        buffer.writeUInt32BE(this[key], i * 4);
      }.bind(this),
    );
    return buffer;
  }
  toBuffer() {
    this.command_length = 16;
    if (this.command_status) {
      return this._initBuffer();
    }
    this._filter('encode');
    const params = commands[this.command].params || {};
    for (const key of Object.keys(this)) {
      if (params[key]) {
        this.command_length += params[key].type.size(this[key]);
      } else if (tlvs[key]) {
        const values = tlvs[key].multiple ? this[key] : [this[key]];
        values.forEach(
          function(value) {
            this.command_length += tlvs[key].type.size(value) + 4;
          }.bind(this),
        );
      }
    }
    const buffer = this._initBuffer();
    let offset = 16;
    for (const key of Object.keys(params)) {
      params[key].type.write(this[key], buffer, offset);
      offset += params[key].type.size(this[key]);
    }
    for (const key of Object.keys(this)) {
      if (tlvs[key]) {
        const values = tlvs[key].multiple ? this[key] : [this[key]];

        values.forEach(function(value) {
          buffer.writeUInt16BE(tlvs[key].id, offset);
          const length = tlvs[key].type.size(value);
          buffer.writeUInt16BE(length, offset + 2);
          offset += 4;
          tlvs[key].type.write(value, buffer, offset);
          offset += length;
        });
      }
    }
    return buffer;
  }
  static fromStream(stream) {
    let buffer = stream.read(4);
    if (!buffer) {
      return false;
    }
    const commandLength = buffer.readUInt32BE(0);
    if (commandLength > PDU.maxLength) {
      throw Error(
        `PDU length was too large (${commandLength}, maximum is ${
          PDU.maxLength
        }).`,
      );
    }
    stream.unshift(buffer);
    buffer = stream.read(commandLength);
    if (!buffer) {
      return false;
    }
    return new PDU(buffer);
  }
  static fromBuffer(buffer) {
    if (buffer.length < 16 || buffer.length < buffer.readUInt32BE(0)) {
      return false;
    }
    return new PDU(buffer);
  }
}

PDU.maxLength = 16384;

export { PDU };
