/* eslint-disable no-param-reassign,camelcase,no-control-regex,object-shorthand,no-useless-escape*/

import iconv from 'iconv-lite';

const encodings = {};

encodings.ASCII = {
  // GSM 03.38
  chars:
    '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
  charCodes: {},
  extChars: {},
  regex: /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà\f^{}\\[~\]|€]*$/,
  init: function() {
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
  match: function(value) {
    return this.regex.test(value);
  },

  encode: function(value) {
    const result = [];
    value = value.replace(
      /[\f^{}\\[~\]|€]/g,
      function(match) {
        return '\x1B' + this.extChars[match];
      }.bind(this),
    );
    for (let i = 0; i < value.length; i++) {
      result.push(value[i] in this.charCodes ? this.charCodes[value[i]] : 0x20);
    }
    return new Buffer(result);
  },
  decode: function(value) {
    let result = '';
    for (let i = 0; i < value.length; i++) {
      result += this.chars[value[i]] || ' ';
    }
    result = result.replace(
      /\x1B([\nΛ()\/<=>¡e])/g,
      function(match, p1) {
        return this.extChars[p1];
      }.bind(this),
    );
    return result;
  },
};

encodings.ASCII.init();

encodings.LATIN1 = {
  match: (value) =>
    value === iconv.decode(iconv.encode(value, 'latin1'), 'latin1'),
  encode: (value) => iconv.encode(value, 'latin1'),
  decode: (value) => iconv.decode(value, 'latin1'),
};

encodings.UCS2 = {
  match: (value) => true, // eslint-disable-line
  encode: (value) => iconv.encode(value, 'utf16-be'),
  decode: (value) => iconv.decode(value, 'utf16-be'),
};

// Object.defineProperty(encodings, 'detect', {
//   value: (value) => {
//     for (var key in encodings) {
//       if (encodings[key].match(value)) {
//         return key;
//       }
//     }
//     return false;
//   },
// });

Object.defineProperty(encodings, 'detect', {
  value: (value) => {
    const vfount = Object.keys(encodings).find((item) =>
      encodings[item].match(value),
    );
    return vfount || false;
  },
});

Object.defineProperty(encodings, 'default', {
  value: 'ASCII',
  writable: true,
});

export { encodings };
