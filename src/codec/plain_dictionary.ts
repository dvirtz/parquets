import { PrimitiveType } from '../declare';
import { CursorBuffer, ParquetCodecOptions } from './declare';
import rle = require('./rle');

export function decodeValues(type: PrimitiveType, cursor: CursorBuffer, count: number, opts: ParquetCodecOptions): any[] {
  opts.bitWidth = cursor.buffer.slice(cursor.offset, cursor.offset + 1).readInt8(0);
  cursor.offset += 1;
  return rle.decodeValues(type, cursor, count, Object.assign({}, opts, { disableEnvelope: true }));
};

export function encodeValues(type: PrimitiveType, values: any[], opts?: ParquetCodecOptions): Buffer {
  if (!('bitWidth' in opts)) {
    throw new Error('bitWidth is required');
  }

  let buf = Buffer.alloc(1);
  buf.writeInt8(opts.bitWidth, 0)

  return Buffer.concat([
    buf,
    rle.encodeValues(type, values, opts)
  ]);
}
