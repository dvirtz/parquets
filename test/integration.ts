import 'jest';
import { promisify } from 'util';
import chai = require('chai');
import fs = require('fs');
import parquet = require('../src');
const assert = chai.assert;
const objectStream = require('object-stream');
import { TestOptions, writeTestFile, readTestFile, mkTestSchema, checkTestData, mkTestRows, TEST_NUM_ROWS } from './utils';

// tslint:disable:ter-prefer-arrow-callback
describe('Parquet', function () {
  jest.setTimeout(90000);

  describe('with DataPageHeaderV1', function () {
    it('write a test file', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'UNCOMPRESSED' };
      return writeTestFile(opts);
    });

    it('write a test file and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'UNCOMPRESSED' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write an empty test file and then read it back', async function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'UNCOMPRESSED' };
      const schema = mkTestSchema(opts);
      const writer = await parquet.ParquetWriter.openFile(schema, 'empty.parquet', opts);
      await writer.close();
      const reader = await parquet.ParquetReader.openFile('empty.parquet');
      expect(reader.getRowCount()).toBe(0);
    });

    it('write an empty test file with empty schema and then read it back', async function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'UNCOMPRESSED' };
      const schema = new parquet.ParquetSchema({});
      const writer = await parquet.ParquetWriter.openFile(schema, 'empty.parquet', opts);
      await writer.close();
      const reader = await parquet.ParquetReader.openFile('empty.parquet');
      expect(reader.getRowCount()).toBe(0);
    });

    it('supports reading from a buffer', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'UNCOMPRESSED' };
      return writeTestFile(opts).then(async function () {
        const data = await promisify(fs.readFile)('fruits.parquet');
        const reader = await parquet.ParquetReader.openBuffer(data);
        await checkTestData(reader);
      });
    });

    it('write a test file with GZIP compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'GZIP' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with SNAPPY compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'SNAPPY' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with LZO compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'LZO' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with BROTLI compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'BROTLI' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with LZ4 compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: false, compression: 'LZ4' };
      return writeTestFile(opts).then(readTestFile);
    });
  });

  describe('with DataPageHeaderV2', function () {
    it('write a test file and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'UNCOMPRESSED' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write an empty test file and then read it back', async function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'UNCOMPRESSED' };
      const schema = mkTestSchema(opts);
      const writer = await parquet.ParquetWriter.openFile(schema, 'empty.parquet', opts);
      await writer.close();
      const reader = await parquet.ParquetReader.openFile('empty.parquet');
      expect(reader.getRowCount()).toBe(0);
    });

    it('write an empty test file with empty schema and then read it back', async function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'UNCOMPRESSED' };
      const schema = new parquet.ParquetSchema({});
      const writer = await parquet.ParquetWriter.openFile(schema, 'empty.parquet', opts);
      await writer.close();
      const reader = await parquet.ParquetReader.openFile('empty.parquet');
      expect(reader.getRowCount()).toBe(0);
    });
    it('write a test file with GZIP compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'GZIP' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with SNAPPY compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'SNAPPY' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with LZO compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'LZO' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with BROTLI compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'BROTLI' };
      return writeTestFile(opts).then(readTestFile);
    });

    it('write a test file with LZ4 compression and then read it back', function () {
      const opts: TestOptions = { useDataPageV2: true, compression: 'LZ4' };
      return writeTestFile(opts).then(readTestFile);
    });

  });

  describe('using the Stream/Transform API', function () {
    it('write a test file', async function () {
      const opts: any = { useDataPageV2: true, compression: 'GZIP' };
      const schema = mkTestSchema(opts);
      const transform = new parquet.ParquetTransformer(schema, opts);
      transform.writer.setMetadata('myuid', '420');
      transform.writer.setMetadata('fnord', 'dronf');
      const ostream = fs.createWriteStream('fruits_stream.parquet');
      const istream = objectStream.fromArray(mkTestRows());
      istream.pipe(transform).pipe(ostream);
      await promisify(ostream.on.bind(ostream, 'finish'))();
      await readTestFile();
    });
  });

  if ('asyncIterator' in Symbol) {
    describe('using the AsyncIterable API', function () {
      it('allows iteration on a cursor using for-await-of', async function () {
        await writeTestFile({ useDataPageV2: true, compression: 'GZIP' });
        const reader = await parquet.ParquetReader.openFile<{ name: string }>('fruits.parquet');

        async function checkTestDataUsingForAwaitOf(cursor: AsyncIterable<{ name: string }>) {
          const names: Set<string> = new Set();
          let rowCount = 0;
          for await (const row of cursor) {
            names.add(row.name);
            rowCount++;
          }
          assert.equal(rowCount, TEST_NUM_ROWS * names.size);
          assert.deepEqual(names, new Set(['apples', 'oranges', 'kiwi', 'banana']));
        }

        // Works with reader (will return all columns)
        await checkTestDataUsingForAwaitOf(reader);

        // Works with a cursor
        const cursor = reader.getCursor(['name']);
        await checkTestDataUsingForAwaitOf(cursor);
      });
    });
  }
});
