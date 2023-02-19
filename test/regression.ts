import 'jest';
import chai = require('chai');
const assert = chai.assert;
import parquet = require('../src');
import path = require('path');
import { writeTestData, mkTestSchema, TestOptions, readTestFile } from './utils';
import { PassThrough } from 'stream';
import { osopen } from '../src/util';

describe('regression tests', function () {
  it('#4 - Error when trying to load Feast demo file', async function () {
    const reader = await parquet.ParquetReader.openFile(path.resolve(__dirname, 'test-files/driver_stats.parquet'));
    assert.equal(reader.schema.fieldList.length, 7);
    let cursor = reader.getCursor();
    let records = [];

    for (let i = 0; i < 5; i++) {
      records.push(await cursor.next());
    }
    assert.isAbove(records.length, 0);
  });

  it('#8 - Date column is not shown', async function () {
    const reader = await parquet.ParquetReader.openFile(path.resolve(__dirname, 'test-files/dim-date.parquet'));
    
    let cursor = reader.getCursor();
    const firstRecord = await cursor.next();
    assert.isNotNaN(firstRecord.Date.getDate());
  });

  it('#19 - close does not exist on - While using stream passthrough with parquets', async function () {    
    const opts: TestOptions = { useDataPageV2: false, compression: 'UNCOMPRESSED' };
    const schema = mkTestSchema(opts);
    const passthrough = new PassThrough;
    const outputStream = await osopen('fruits.parquet', {});
    passthrough.pipe(outputStream);
    const writer = await parquet.ParquetWriter.openStream(schema, outputStream, opts);
    await writeTestData(writer, opts).then(readTestFile);
  });
});
