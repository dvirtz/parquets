import 'jest';
import chai = require('chai');
const assert = chai.assert;
import parquet = require('../src');
import path = require('path');

describe('dictionary encoding', function() {
  it('should read uncompressed dictionary from spark', async function() {
    let reader =  await parquet.ParquetReader.openFile(path.resolve(__dirname,'test-files/spark-uncompressed-dict.parquet'));
    let cursor = reader.getCursor();
    let records = [];

    for (let i = 0; i < 5; i++) {
      records.push(await cursor.next());
    }

    assert.deepEqual(records.map(d => d.name),['apples','oranges','kiwi','banana','apples']);
  });
});