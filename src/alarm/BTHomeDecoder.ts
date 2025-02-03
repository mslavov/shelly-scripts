declare global {
  interface String {
    at(index: number): number;
  }
}

export const ALLTERCO_MFD_ID_STR = "0ba9";
export const BTHOME_SVC_ID_STR = "fcd2";

export const ALLTERCO_MFD_ID = JSON.parse("0x" + ALLTERCO_MFD_ID_STR);
export const BTHOME_SVC_ID = JSON.parse("0x" + BTHOME_SVC_ID_STR);

// Data types
export const uint8 = 0;
export const int8 = 1;
export const uint16 = 2;
export const int16 = 3;
export const uint24 = 4;
export const int24 = 5;

export function getByteSize(type: number): number {
  if (type === uint8 || type === int8) return 1;
  if (type === uint16 || type === int16) return 2;
  if (type === uint24 || type === int24) return 3;
  //impossible as advertisements are much smaller;
  return 255;
}

export const BTH = {
  0x00: { n: "pid", t: uint8 },
  0x01: { n: "Battery", t: uint8, u: "%" },
  0x05: { n: "Illuminance", t: uint24, f: 0.01 },
  0x1a: { n: "Door", t: uint8 },
  0x20: { n: "Moisture", t: uint8 },
  0x2d: { n: "Window", t: uint8 },
  0x3a: { n: "Button", t: uint8 },
  0x3f: { n: "Rotation", t: int16, f: 0.1 },
};

interface DecodedData {
  encryption?: boolean;
  BTHome_version?: number;
  pid?: number;
  [key: string]: any;
}

export const BTHomeDecoder = {
  utoi: function (num: number, bitsz: number): number {
    let mask = 1 << (bitsz - 1);
    return num & mask ? num - (1 << bitsz) : num;
  },

  getUInt8: function (buffer: string): number {
    return buffer.at(0);
  },

  getInt8: function (buffer: string): number {
    return this.utoi(this.getUInt8(buffer), 8);
  },

  getUInt16LE: function (buffer: string): number {
    return 0xffff & ((buffer.at(1) << 8) | buffer.at(0));
  },

  getInt16LE: function (buffer: string): number {
    return this.utoi(this.getUInt16LE(buffer), 16);
  },

  getUInt24LE: function (buffer: string): number {
    return 0x00ffffff & ((buffer.at(2) << 16) | (buffer.at(1) << 8) | buffer.at(0));
  },

  getInt24LE: function (buffer: string): number {
    return this.utoi(this.getUInt24LE(buffer), 24);
  },

  getBufValue: function (type: number, buffer: string): number | null {
    if (buffer.length < getByteSize(type)) return null;
    let res = null;
    if (type === uint8) res = this.getUInt8(buffer);
    if (type === int8) res = this.getInt8(buffer);
    if (type === uint16) res = this.getUInt16LE(buffer);
    if (type === int16) res = this.getInt16LE(buffer);
    if (type === uint24) res = this.getUInt24LE(buffer);
    if (type === int24) res = this.getInt24LE(buffer);
    return res;
  },

  unpack: function (buffer: string): DecodedData | null {
    // beacons might not provide BTH service data
    if (typeof buffer !== "string" || buffer.length === 0) return null;
    let result: DecodedData = {};
    let _dib = buffer.at(0);
    result["encryption"] = _dib & 0x1 ? true : false;
    result["BTHome_version"] = _dib >> 5;
    if (result["BTHome_version"] !== 2) return null;
    //Can not handle encrypted data
    if (result["encryption"]) return result;
    buffer = buffer.slice(1);

    let _bth;
    let _value;
    while (buffer.length > 0) {
      _bth = BTH[buffer.at(0)];
      if (_bth === undefined) {
        console.log("BTH: unknown type");
        break;
      }
      buffer = buffer.slice(1);
      _value = this.getBufValue(_bth.t, buffer);
      if (_value === null) break;
      if (typeof _bth.f !== "undefined") _value = _value * _bth.f;
      result[_bth.n] = _value;
      buffer = buffer.slice(getByteSize(_bth.t));
    }
    return result;
  },
};
