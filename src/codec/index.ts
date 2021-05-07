import { ParquetCodec } from '../declare';
import { ParquetCodecKit } from './declare';
import RLE = require('./rle');
import PLAIN = require('./plain');
import PLAIN_DICTIONARY = require('./plain_dictionary')

export * from './declare';

export const PARQUET_CODEC: Record<ParquetCodec, ParquetCodecKit> = {
  PLAIN: {
    encodeValues: PLAIN.encodeValues,
    decodeValues: PLAIN.decodeValues
  },
  RLE: {
    encodeValues: RLE.encodeValues,
    decodeValues: RLE.decodeValues
  },
  PLAIN_DICTIONARY: {
    encodeValues: PLAIN_DICTIONARY.encodeValues,
    decodeValues: PLAIN_DICTIONARY.decodeValues
  }
};
