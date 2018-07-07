"use strict";

exports.__esModule = true;
exports.encodings = void 0;

var _iconvLite = _interopRequireDefault(require("iconv-lite"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const encodings = {};
exports.encodings = encodings;
encodings.ASCII = {
  chars: '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
  charCodes: {},
  extChars: {},
  regex: /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà\f^{}\\[~\]|€]*$/,
  init: function () {
    for (let i = 0; i < this.chars.length; i++) {
      this.charCodes[this.chars[i]] = i;
    }

    const from = '\f^{}\\[~]|€';
    const to = '\nΛ()/<=>¡e';

    for (let i = 0; i < from.length; i++) {
      this.extChars[from[i]] = to[i];
      this.extChars[to[i]] = from[i];
    }
  },
  match: function (value) {
    return this.regex.test(value);
  },
  encode: function (value) {
    const result = [];
    value = value.replace(/[\f^{}\\[~\]|€]/g, function (match) {
      return '\x1B' + this.extChars[match];
    }.bind(this));

    for (let i = 0; i < value.length; i++) {
      result.push(value[i] in this.charCodes ? this.charCodes[value[i]] : 0x20);
    }

    return new Buffer(result);
  },
  decode: function (value) {
    let result = '';

    for (let i = 0; i < value.length; i++) {
      result += this.chars[value[i]] || ' ';
    }

    result = result.replace(/\x1B([\nΛ()\/<=>¡e])/g, function (match, p1) {
      return this.extChars[p1];
    }.bind(this));
    return result;
  }
};
encodings.ASCII.init();
encodings.LATIN1 = {
  match: value => value === _iconvLite.default.decode(_iconvLite.default.encode(value, 'latin1'), 'latin1'),
  encode: value => _iconvLite.default.encode(value, 'latin1'),
  decode: value => _iconvLite.default.decode(value, 'latin1')
};
encodings.UCS2 = {
  match: value => true,
  encode: value => _iconvLite.default.encode(value, 'utf16-be'),
  decode: value => _iconvLite.default.decode(value, 'utf16-be')
};
Object.defineProperty(encodings, 'detect', {
  value: value => {
    const vfount = Object.keys(encodings).find(item => encodings[item].match(value));
    return vfount || false;
  }
});
Object.defineProperty(encodings, 'default', {
  value: 'ASCII',
  writable: true
});
//# sourceMappingURL=encodings.js.map