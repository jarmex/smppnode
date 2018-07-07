"use strict";

exports.__esModule = true;
exports.types = void 0;
const types = {
  int8: {
    read: (buffer, offset) => buffer.readUInt8(offset),
    write: (value, buffer, offset) => {
      buffer.writeUInt8(value || 0, offset);
    },
    size: () => 1,
    default: 0
  },
  int16: {
    read: (buffer, offset) => buffer.readUInt16BE(offset),
    write: (value, buffer, offset) => {
      buffer.writeUInt16BE(value || 0, offset);
    },
    size: () => 2,
    default: 0
  },
  int32: {
    read: (buffer, offset) => buffer.readUInt32BE(offset),
    write: (value, buffer, offset) => {
      buffer.writeUInt32BE(value || 0, offset);
    },
    size: () => 4,
    default: 0
  },
  string: {
    read: (buffer, offset) => {
      const length = buffer.readUInt8(offset++);
      return buffer.toString('ascii', offset, offset + length);
    },
    write: (value, buffer, offset) => {
      buffer.writeUInt8(value.length, offset++);

      if (typeof value === 'string') {
        value = new Buffer(value, 'ascii');
      }

      value.copy(buffer, offset);
    },
    size: value => value.length + 1,
    default: ''
  },
  cstring: {
    read: (buffer, offset) => {
      let length = 0;

      while (buffer[offset + length]) {
        length++;
      }

      return buffer.toString('ascii', offset, offset + length);
    },
    write: (value, buffer, offset) => {
      if (typeof value === 'string') {
        value = new Buffer(value, 'ascii');
      }

      value.copy(buffer, offset);
      buffer[offset + value.length] = 0;
    },
    size: value => value.length + 1,
    default: ''
  },
  buffer: {
    read: (buffer, offset) => {
      const length = buffer.readUInt8(offset++);
      return buffer.slice(offset, offset + length);
    },
    write: (value, buffer, offset) => {
      buffer.writeUInt8(value.length, offset++);

      if (typeof value === 'string') {
        value = new Buffer(value, 'ascii');
      }

      value.copy(buffer, offset);
    },
    size: value => value.length + 1,
    default: new Buffer(0)
  },
  dest_address_array: {
    read: (buffer, offset) => {
      let dest_address;
      let dest_flag;
      const result = [];
      let number_of_dests = buffer.readUInt8(offset++);

      while (number_of_dests-- > 0) {
        dest_flag = buffer.readUInt8(offset++);

        if (dest_flag === 1) {
          dest_address = {
            dest_addr_ton: buffer.readUInt8(offset++),
            dest_addr_npi: buffer.readUInt8(offset++),
            destination_addr: types.cstring.read(buffer, offset)
          };
          offset += types.cstring.size(dest_address.destination_addr);
        } else {
          dest_address = {
            dl_name: types.cstring.read(buffer, offset)
          };
          offset += types.cstring.size(dest_address.dl_name);
        }

        result.push(dest_address);
      }

      return result;
    },
    write: (value, buffer, offset) => {
      buffer.writeUInt8(value.length, offset++);
      value.forEach(dest_address => {
        if ('dl_name' in dest_address) {
          buffer.writeUInt8(2, offset++);
          types.cstring.write(dest_address.dl_name, buffer, offset);
          offset += types.cstring.size(dest_address.dl_name);
        } else {
          buffer.writeUInt8(1, offset++);
          buffer.writeUInt8(dest_address.dest_addr_ton || 0, offset++);
          buffer.writeUInt8(dest_address.dest_addr_npi || 0, offset++);
          types.cstring.write(dest_address.destination_addr, buffer, offset);
          offset += types.cstring.size(dest_address.destination_addr);
        }
      });
    },
    size: value => {
      let size = 1;
      value.forEach(dest_address => {
        if ('dl_name' in dest_address) {
          size += types.cstring.size(dest_address.dl_name) + 1;
        } else {
          size += types.cstring.size(dest_address.destination_addr) + 3;
        }
      });
      return size;
    },
    default: []
  },
  unsuccess_sme_array: {
    read: (buffer, offset) => {
      let unsuccess_sme;
      const result = [];
      let no_unsuccess = buffer.readUInt8(offset++);

      while (no_unsuccess-- > 0) {
        unsuccess_sme = {
          dest_addr_ton: buffer.readUInt8(offset++),
          dest_addr_npi: buffer.readUInt8(offset++),
          destination_addr: types.cstring.read(buffer, offset)
        };
        offset += types.cstring.size(unsuccess_sme.destination_addr);
        unsuccess_sme.error_status_code = buffer.readUInt32BE(offset);
        offset += 4;
        result.push(unsuccess_sme);
      }

      return result;
    },
    write: (value, buffer, offset) => {
      buffer.writeUInt8(value.length, offset++);
      value.forEach(unsuccess_sme => {
        buffer.writeUInt8(unsuccess_sme.dest_addr_ton || 0, offset++);
        buffer.writeUInt8(unsuccess_sme.dest_addr_npi || 0, offset++);
        types.cstring.write(unsuccess_sme.destination_addr, buffer, offset);
        offset += types.cstring.size(unsuccess_sme.destination_addr);
        buffer.writeUInt32BE(unsuccess_sme.error_status_code, offset);
        offset += 4;
      });
    },
    size: value => {
      let size = 1;
      value.forEach(unsuccess_sme => {
        size += types.cstring.size(unsuccess_sme.destination_addr) + 6;
      });
      return size;
    },
    default: []
  }
};
exports.types = types;
types.tlv = {
  int8: types.int8,
  int16: types.int16,
  int32: types.int32,
  cstring: types.cstring,
  string: {
    read: (buffer, offset, length) => buffer.toString('ascii', offset, offset + length),
    write: (value, buffer, offset) => {
      if (typeof value === 'string') {
        value = new Buffer(value, 'ascii');
      }

      value.copy(buffer, offset);
    },
    size: value => value.length,
    default: ''
  },
  buffer: {
    read: (buffer, offset, length) => buffer.slice(offset, offset + length),
    write: (value, buffer, offset) => {
      if (typeof value === 'string') {
        value = new Buffer(value, 'ascii');
      }

      value.copy(buffer, offset);
    },
    size: value => value.length,
    default: null
  }
};
//# sourceMappingURL=types.js.map