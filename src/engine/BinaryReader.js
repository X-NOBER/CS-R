export class BinaryReader {
  constructor(buffer) {
    this.bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.offset = 0;
  }

  get size() {
    return this.view.byteLength;
  }

  seek(offset) {
    this.offset = offset;
    return this;
  }

  remaining() {
    return this.view.byteLength - this.offset;
  }

  u8() {
    return this.view.getUint8(this.offset++);
  }

  i8() {
    return this.view.getInt8(this.offset++);
  }

  u16() {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  i16() {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  i32() {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  u32() {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  f32() {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  vec3() {
    return [this.f32(), this.f32(), this.f32()];
  }

  bytes(count) {
    const slice = this.bytes.subarray(this.offset, this.offset + count);
    this.offset += count;
    return slice;
  }

  cstring(length) {
    const slice = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    let end = slice.indexOf(0);
    if (end < 0) end = slice.length;
    return new TextDecoder("latin1").decode(slice.subarray(0, end));
  }

  at(offset) {
    return new BinaryReader(this.bytes.subarray(offset));
  }
}
