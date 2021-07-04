import 'jest';
import chai = require('chai');
const assert = chai.assert;
import parquet = require('../src');
import path = require('path');

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
});
