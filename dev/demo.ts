// tslint:disable-next-line:import-blacklist
import { ParquetCompression, ParquetReader, ParquetSchema, ParquetWriter } from '../src';
import { ParquetWriterOptions } from '../src/writer';

const TEST_VTIME = Date.now();
const TEST_NUM_ROWS = 10;

// write a new file 'fruits.parquet'
async function example() {

  const opts: ParquetWriterOptions = {
    useDataPageV2: false,
    compression: 'UNCOMPRESSED' as ParquetCompression,
    // pageSize: 12
  };

  const schema = new ParquetSchema({
    name: { type: 'UTF8', compression: opts.compression },
    // map: { type: '' },
    // parquet-mr actually doesnt support this
    // quantity: { type: 'INT64', encoding: 'RLE', typeLength: 6, optional: true, compression: opts.compression },
    quantity: { type: 'INT64', optional: true, compression: opts.compression },
    // price: { type: 'DOUBLE', compression: opts.compression },
    // date: { type: 'TIMESTAMP_MICROS', compression: opts.compression },
    // day: { type: 'DATE', compression: opts.compression },
    // finger: { type: 'FIXED_LEN_BYTE_ARRAY', compression: opts.compression, typeLength: 5 },
    // inter: { type: 'INTERVAL', compression: opts.compression },
    // // TODO: Drill compatible
    stock: {
      repeated: true,
      fields: {
        quantity: { type: 'INT64', repeated: true },
        warehouse: { type: 'UTF8', /*compression: opts.compression*/ },
        loc: {
          optional: true,
          fields: {
            lon: { type: 'FLOAT' },
            lat: { type: 'FLOAT' }
          }
        }
      }
    },
    // colour: { type: 'UTF8', repeated: true, compression: opts.compression },
    // meta_json: { type: 'BSON', optional: true, compression: opts.compression },
    // compression: { type: 'UTF8', optional: true, compression: opts.compression }
  });

  console.log(schema);

  const writer = await ParquetWriter.openFile(schema, 'fruits.parquet', opts);
  const rows = mkTestRows(opts);
  for (const row of rows) {
    writer.appendRow(row);
  }
  await writer.close();
  console.log('Write: OK');

  const reader = await ParquetReader.openFile('fruits.parquet');
  console.log(reader.getSchema());
  const cursor = reader.getCursor();
  let record = null;
  while (record = await cursor.next()) {
    console.log(record);
  }
  reader.close();
  console.log('Read: OK');
}

function mkTestRows(opts?: any) {
  const rows = [];

  for (let i = 0; i < TEST_NUM_ROWS; ++i) {
    rows.push({
      name: 'apples',
      quantity: 10,
      price: 2.6,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 1000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      stock: [
        { quantity: 10, warehouse: 'A' },
        { quantity: 20, warehouse: 'B', loc: { lon: 6, lat: 9 } }
      ],
      colour: ['green', 'red', 'blue'],
      compression: opts && opts.compression
    });

    rows.push({
      name: 'oranges',
      quantity: 20,
      price: 2.7,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 2000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      stock: {
        quantity: [50, 33],
        warehouse: 'X'
      },
      colour: ['orange']
    });

    rows.push({
      name: 'kiwi',
      price: 4.2,
      quantity: undefined,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 8000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      stock: [
        { quantity: 42, warehouse: 'f' },
        { quantity: 20, warehouse: 'x' }
      ],
      colour: ['green', 'brown'],
      meta_json: { expected_ship_date: new Date(TEST_VTIME) }
    });

    rows.push({
      name: 'banana',
      price: 3.2,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 6000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      colour: ['yellow'],
      meta_json: { shape: 'curved' }
    });
  }

  return rows;
}

export function mkTestRowsNoRepeat(opts?: any) {
  const rows = [];

  for (let i = 0; i < TEST_NUM_ROWS; ++i) {
    rows.push({
      name: 'apples',
      quantity: 10,
      price: 2.6,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 1000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      stock: { quantity: 10, warehouse: 'A' },
      colour: ['green', 'red'],
      compression: opts && opts.compression
    });

    rows.push({
      name: 'oranges',
      quantity: 20,
      price: 2.7,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 2000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      stock: {
        quantity: 50,
        warehouse: 'X'
      },
      colour: ['orange']
    });

    rows.push({
      name: 'kiwi',
      price: 4.2,
      quantity: undefined,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 8000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      stock: { quantity: 20, warehouse: 'x' },
      colour: ['green', 'brown'],
      meta_json: { expected_ship_date: new Date(TEST_VTIME) }
    });

    rows.push({
      name: 'banana',
      price: 3.2,
      day: new Date('2017-11-26'),
      date: new Date(TEST_VTIME + 6000 * i),
      finger: 'FNORD',
      inter: { months: 42, days: 23, milliseconds: 777 },
      colour: ['yellow'],
      meta_json: { shape: 'curved' }
    });
  }

  return rows;
}

example();
