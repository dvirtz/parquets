import { ParquetCompression } from '../src';
import parquet = require('../src');
import chai = require('chai');
const assert = chai.assert;

export interface TestOptions {
  useDataPageV2: boolean;
  compression: ParquetCompression;
}

export function mkTestSchema(opts: TestOptions) {
  return new parquet.ParquetSchema({
    name: { type: 'UTF8', compression: opts.compression },
    // quantity:   { type: 'INT64', encoding: 'RLE', typeLength: 6, optional: true, compression: opts.compression },
    // parquet-mr actually doesnt support this
    quantity: { type: 'INT64', optional: true, compression: opts.compression },
    price: { type: 'DOUBLE', compression: opts.compression },
    date: { type: 'TIMESTAMP_MICROS', compression: opts.compression },
    day: { type: 'DATE', compression: opts.compression },
    finger: { type: 'FIXED_LEN_BYTE_ARRAY', compression: opts.compression, typeLength: 5 },
    inter: { type: 'INTERVAL', compression: opts.compression },
    stock: {
      repeated: true,
      fields: {
        quantity: { type: 'INT64', repeated: true, compression: opts.compression },
        warehouse: { type: 'UTF8', compression: opts.compression },
        opts: {
          optional: true,
          fields: {
            a: { type: 'INT32', compression: opts.compression },
            b: { type: 'INT32', optional: true, compression: opts.compression }
          }
        },
        tags: {
          optional: true,
          repeated: true,
          fields: {
            name: { type: 'UTF8', compression: opts.compression },
            val: { type: 'UTF8', compression: opts.compression }
          }
        }
      }
    },
    colour: { type: 'UTF8', repeated: true, compression: opts.compression },
    meta_json: { type: 'BSON', optional: true, compression: opts.compression }
  });
}

export function mkTestRows() {
  const rows: any[] = [];

  for (let i = 0; i < TEST_NUM_ROWS; i++) {
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
        { quantity: 20, warehouse: 'B', opts: { a: 1 }, tags: [{ name: 't', val: 'v' }] }
      ],
      colour: ['green', 'red']
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

export async function writeTestData(writer: parquet.ParquetWriter<unknown>, opts: TestOptions) {
  writer.setMetadata('myuid', '420');
  writer.setMetadata('fnord', 'dronf');
  const rows = mkTestRows();
  for (const row of rows) {
    await writer.appendRow(row);
  }
  await writer.close();
}

export const TEST_NUM_ROWS = 1000;
const TEST_VTIME = Date.now();

export async function writeTestFile(opts: TestOptions) {
  const schema = mkTestSchema(opts);
  const writer = await parquet.ParquetWriter.openFile(schema, 'fruits.parquet', opts);
  await writeTestData(writer, opts);
}

export async function readTestFile() {
  const reader = await parquet.ParquetReader.openFile('fruits.parquet');
  await checkTestData(reader);
}

export async function checkTestData(reader: parquet.ParquetReader<unknown>) {
  assert.equal(reader.getRowCount(), TEST_NUM_ROWS * 4);
  assert.deepEqual(reader.getMetadata(), { myuid: '420', fnord: 'dronf' });

  const schema = reader.getSchema();
  assert.equal(schema.fieldList.length, 18);
  assert(schema.fields.name);
  assert(schema.fields.stock);
  assert(schema.fields.stock.fields.quantity);
  assert(schema.fields.stock.fields.warehouse);
  assert(schema.fields.stock.fields.opts);
  assert(schema.fields.stock.fields.opts.fields.a);
  assert(schema.fields.stock.fields.opts.fields.b);
  assert(schema.fields.stock.fields.tags);
  assert(schema.fields.stock.fields.tags.fields.name);
  assert(schema.fields.stock.fields.tags.fields.val);
  assert(schema.fields.price);

  {
    const c = schema.fields.name;
    assert.equal(c.name, 'name');
    assert.equal(c.primitiveType, 'BYTE_ARRAY');
    assert.equal(c.originalType, 'UTF8');
    assert.deepEqual(c.path, ['name']);
    assert.equal(c.repetitionType, 'REQUIRED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 0);
    assert.equal(c.dLevelMax, 0);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.stock;
    assert.equal(c.name, 'stock');
    assert.equal(c.primitiveType, undefined);
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['stock']);
    assert.equal(c.repetitionType, 'REPEATED');
    assert.equal(c.encoding, undefined);
    assert.equal(c.compression, undefined);
    assert.equal(c.rLevelMax, 1);
    assert.equal(c.dLevelMax, 1);
    assert.equal(!!c.isNested, true);
    assert.equal(c.fieldCount, 4);
  }

  {
    const c = schema.fields.stock.fields.quantity;
    assert.equal(c.name, 'quantity');
    assert.equal(c.primitiveType, 'INT64');
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['stock', 'quantity']);
    assert.equal(c.repetitionType, 'REPEATED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 2);
    assert.equal(c.dLevelMax, 2);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.stock.fields.warehouse;
    assert.equal(c.name, 'warehouse');
    assert.equal(c.primitiveType, 'BYTE_ARRAY');
    assert.equal(c.originalType, 'UTF8');
    assert.deepEqual(c.path, ['stock', 'warehouse']);
    assert.equal(c.repetitionType, 'REQUIRED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 1);
    assert.equal(c.dLevelMax, 1);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.stock.fields.opts;
    assert.equal(c.name, 'opts');
    assert.equal(c.primitiveType, undefined);
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['stock', 'opts']);
    assert.equal(c.repetitionType, 'OPTIONAL');
    assert.equal(c.encoding, undefined);
    assert.equal(c.compression, undefined);
    assert.equal(c.rLevelMax, 1);
    assert.equal(c.dLevelMax, 2);
    assert.equal(!!c.isNested, true);
    assert.equal(c.fieldCount, 2);
  }

  {
    const c = schema.fields.stock.fields.opts.fields.a;
    assert.equal(c.name, 'a');
    assert.equal(c.primitiveType, 'INT32');
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['stock', 'opts', 'a']);
    assert.equal(c.repetitionType, 'REQUIRED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 1);
    assert.equal(c.dLevelMax, 2);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.stock.fields.opts.fields.b;
    assert.equal(c.name, 'b');
    assert.equal(c.primitiveType, 'INT32');
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['stock', 'opts', 'b']);
    assert.equal(c.repetitionType, 'OPTIONAL');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 1);
    assert.equal(c.dLevelMax, 3);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.stock.fields.tags;
    assert.equal(c.name, 'tags');
    assert.equal(c.primitiveType, undefined);
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['stock', 'tags']);
    assert.equal(c.repetitionType, 'REPEATED');
    assert.equal(c.encoding, undefined);
    assert.equal(c.compression, undefined);
    assert.equal(c.rLevelMax, 2);
    assert.equal(c.dLevelMax, 2);
    assert.equal(!!c.isNested, true);
    assert.equal(c.fieldCount, 2);
  }

  {
    const c = schema.fields.stock.fields.tags.fields.name;
    assert.equal(c.name, 'name');
    assert.equal(c.primitiveType, 'BYTE_ARRAY');
    assert.equal(c.originalType, 'UTF8');
    assert.deepEqual(c.path, ['stock', 'tags', 'name']);
    assert.equal(c.repetitionType, 'REQUIRED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 2);
    assert.equal(c.dLevelMax, 2);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.stock.fields.tags.fields.val;
    assert.equal(c.name, 'val');
    assert.equal(c.primitiveType, 'BYTE_ARRAY');
    assert.equal(c.originalType, 'UTF8');
    assert.deepEqual(c.path, ['stock', 'tags', 'val']);
    assert.equal(c.repetitionType, 'REQUIRED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 2);
    assert.equal(c.dLevelMax, 2);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const c = schema.fields.price;
    assert.equal(c.name, 'price');
    assert.equal(c.primitiveType, 'DOUBLE');
    assert.equal(c.originalType, undefined);
    assert.deepEqual(c.path, ['price']);
    assert.equal(c.repetitionType, 'REQUIRED');
    assert.equal(c.encoding, 'PLAIN');
    assert.equal(c.compression, 'UNCOMPRESSED');
    assert.equal(c.rLevelMax, 0);
    assert.equal(c.dLevelMax, 0);
    assert.equal(!!c.isNested, false);
    assert.equal(c.fieldCount, undefined);
  }

  {
    const cursor = reader.getCursor();
    for (let i = 0; i < TEST_NUM_ROWS; i++) {
      assert.deepEqual(await cursor.next(), {
        name: 'apples',
        quantity: 10,
        price: 2.6,
        day: new Date('2017-11-26'),
        date: new Date(TEST_VTIME + 1000 * i),
        finger: Buffer.from('FNORD'),
        inter: { months: 42, days: 23, milliseconds: 777 },
        stock: [
          { quantity: [10], warehouse: 'A' },
          { quantity: [20], warehouse: 'B', opts: { a: 1 }, tags: [{ name: 't', val: 'v' }] }
        ],
        colour: ['green', 'red']
      });

      assert.deepEqual(await cursor.next(), {
        name: 'oranges',
        quantity: 20,
        price: 2.7,
        day: new Date('2017-11-26'),
        date: new Date(TEST_VTIME + 2000 * i),
        finger: Buffer.from('FNORD'),
        inter: { months: 42, days: 23, milliseconds: 777 },
        stock: [
          { quantity: [50, 33], warehouse: 'X' }
        ],
        colour: ['orange']
      });

      assert.deepEqual(await cursor.next(), {
        name: 'kiwi',
        price: 4.2,
        day: new Date('2017-11-26'),
        date: new Date(TEST_VTIME + 8000 * i),
        finger: Buffer.from('FNORD'),
        inter: { months: 42, days: 23, milliseconds: 777 },
        stock: [
          { quantity: [42], warehouse: 'f' },
          { quantity: [20], warehouse: 'x' }
        ],
        colour: ['green', 'brown'],
        meta_json: { expected_ship_date: new Date(TEST_VTIME) }
      });

      assert.deepEqual(await cursor.next(), {
        name: 'banana',
        price: 3.2,
        day: new Date('2017-11-26'),
        date: new Date(TEST_VTIME + 6000 * i),
        finger: Buffer.from('FNORD'),
        inter: { months: 42, days: 23, milliseconds: 777 },
        colour: ['yellow'],
        meta_json: { shape: 'curved' }
      });
    }

    assert.equal(await cursor.next(), null);
  }

  {
    const cursor = reader.getCursor(['name']);
    for (let i = 0; i < TEST_NUM_ROWS; i++) {
      assert.deepEqual(await cursor.next(), { name: 'apples' });
      assert.deepEqual(await cursor.next(), { name: 'oranges' });
      assert.deepEqual(await cursor.next(), { name: 'kiwi' });
      assert.deepEqual(await cursor.next(), { name: 'banana' });
    }

    assert.equal(await cursor.next(), null);
  }

  {
    const cursor = reader.getCursor(['name', 'quantity']);
    for (let i = 0; i < TEST_NUM_ROWS; i++) {
      assert.deepEqual(await cursor.next(), { name: 'apples', quantity: 10 });
      assert.deepEqual(await cursor.next(), { name: 'oranges', quantity: 20 });
      assert.deepEqual(await cursor.next(), { name: 'kiwi' });
      assert.deepEqual(await cursor.next(), { name: 'banana' });
    }

    assert.equal(await cursor.next(), null);
  }

  await reader.close();
}
