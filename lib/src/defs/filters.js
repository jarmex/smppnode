"use strict";

exports.__esModule = true;
exports.filters = void 0;

var _encodings = require("./encodings");

var _constants = require("./constants");

const filters = {};
exports.filters = filters;
filters.time = {
  encode: value => {
    if (!value) {
      return value;
    }

    if (typeof value === 'string') {
      if (value.length <= 12) {
        const valuetest = `000000000000${value}`.substr(-12);
        return `${valuetest}000R`;
      }

      return value;
    }

    if (value instanceof Date) {
      let result = value.getUTCFullYear().toString().substr(-2);
      result += `0${value.getUTCMonth() + 1}`.substr(-2);
      result += `0${value.getUTCDate()}`.substr(-2);
      result += `0${value.getUTCHours()}`.substr(-2);
      result += `0${value.getUTCMinutes()}`.substr(-2);
      result += `0${value.getUTCSeconds()}`.substr(-2);
      result += `00${value.getUTCMilliseconds()}`.substr(-3, 1);
      result += '00+';
      return result;
    }

    return value;
  },
  decode: value => {
    if (!value || typeof value !== 'string') {
      return value;
    }

    if (value.substr(-1) === 'R') {
      const result = new Date();
      const match = value.match(/^(..)(..)(..)(..)(..)(..).*$/);
      ['FullYear', 'Month', 'Date', 'Hours', 'Minutes', 'Seconds'].forEach((method, i) => {
        result[`set${method}`](result[`get${method}`]() + +match[++i]);
      });
      return result;
    }

    const century = `000${new Date().getUTCFullYear()}`.substr(-4, 2);
    const result = new Date(value.replace(/^(..)(..)(..)(..)(..)(..)(.)?.*$/, `${century}$1-$2-$3 $4:$5:$6:$700 UTC`));
    const match = value.match(/(..)([-+])$/);

    if (match && match[1] !== '00') {
      let diff = match[1] * 15;

      if (match[2] === '+') {
        diff = -diff;
      }

      result.setMinutes(result.getMinutes() + diff);
    }

    return result;
  }
};
filters.message = {
  encode: function (value) {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    let message = typeof value === 'string' ? value : value.message;

    if (typeof message === 'string') {
      const encoding = _encodings.encodings.detect(message);

      if (message && this.data_coding === null) {
        this.data_coding = _constants.constants.ENCODING[encoding];
      }

      message = _encodings.encodings[encoding].encode(message);
    }

    if (!value.udh || !value.udh.length) {
      return message;
    }

    if ('esm_class' in this) {
      this.esm_class = this.esm_class | _constants.constants.ESM_CLASS.UDH_INDICATOR;
    }

    return Buffer.concat([value.udh, message]);
  },
  decode: function (value) {
    if (!Buffer.isBuffer(value) || !('data_coding' in this)) {
      return value;
    }

    let encoding = this.data_coding & 0x0f;

    if (!encoding) {
      encoding = _encodings.encodings.default;
    } else {
      const sencoding = Object.keys(_constants.constants.ENCODING).find(item => _constants.constants.ENCODING[item] === encoding);
      encoding = sencoding;
    }

    const udhi = this.esm_class & _constants.constants.ESM_CLASS.UDH_INDICATOR;
    const result = {};

    if (value.length && udhi) {
      result.udh = value.slice(0, value[0] + 1);
      result.message = value.slice(value[0] + 1);
    } else {
      result.message = value;
    }

    if (_encodings.encodings[encoding]) {
      result.message = _encodings.encodings[encoding].decode(result.message);
    }

    return result;
  }
};
filters.billing_identification = {
  encode: value => {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    const result = new Buffer(value.data.length + 1);
    result.writeUInt8(value.format, 0);
    value.data.copy(result, 1);
    return result;
  },
  decode: value => {
    if (!Buffer.isBuffer(value)) {
      return value;
    }

    return {
      format: value.readUInt8(0),
      data: value.slice(1)
    };
  }
};
filters.broadcast_area_identifier = {
  encode: value => {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    if (typeof value === 'string') {
      value = {
        format: _constants.constants.BROADCAST_AREA_FORMAT.NAME,
        data: value
      };
    }

    if (typeof value.data === 'string') {
      value.data = new Buffer(value.data, 'ascii');
    }

    const result = new Buffer(value.data.length + 1);
    result.writeUInt8(value.format, 0);
    value.data.copy(result, 1);
    return result;
  },
  decode: value => {
    if (!Buffer.isBuffer(value)) {
      return value;
    }

    const result = {
      format: value.readUInt8(0),
      data: value.slice(1)
    };

    if (result.format === _constants.constants.BROADCAST_AREA_FORMAT.NAME) {
      result.data = result.data.toString('ascii');
    }

    return result;
  }
};
filters.broadcast_content_type = {
  encode: value => {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    const result = new Buffer(3);
    result.writeUInt8(value.network, 0);
    result.writeUInt16BE(value.content_type, 1);
    return result;
  },
  decode: value => {
    if (!Buffer.isBuffer(value)) {
      return value;
    }

    return {
      network: value.readUInt8(0),
      content_type: value.readUInt16BE(1)
    };
  }
};
filters.broadcast_frequency_interval = {
  encode: value => {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    const result = new Buffer(3);
    result.writeUInt8(value.unit, 0);
    result.writeUInt16BE(value.interval, 1);
    return result;
  },
  decode: value => {
    if (!Buffer.isBuffer(value)) {
      return value;
    }

    return {
      unit: value.readUInt8(0),
      interval: value.readUInt16BE(1)
    };
  }
};
filters.callback_num = {
  encode: value => {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    const result = new Buffer(value.number.length + 3);
    result.writeUInt8(value.digit_mode || 0, 0);
    result.writeUInt8(value.ton || 0, 1);
    result.writeUInt8(value.npi || 0, 2);
    result.write(value.number, 3, 'ascii');
    return result;
  },
  decode: value => {
    if (!Buffer.isBuffer(value)) {
      return value;
    }

    return {
      digit_mode: value.readUInt8(0),
      ton: value.readUInt8(1),
      npi: value.readUInt8(2),
      number: value.toString('ascii', 3)
    };
  }
};
filters.callback_num_atag = {
  encode: value => {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    const result = new Buffer(value.display.length + 1);
    result.writeUInt8(value.encoding, 0);

    if (typeof value.display === 'string') {
      value.display = new Buffer(value.display, 'ascii');
    }

    value.display.copy(result, 1);
    return result;
  },
  decode: value => {
    if (!Buffer.isBuffer(value)) {
      return value;
    }

    return {
      encoding: value.readUInt8(0),
      display: value.slice(1)
    };
  }
};
//# sourceMappingURL=filters.js.map