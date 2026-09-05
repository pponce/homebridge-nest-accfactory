// Code version 2026.09.05
import assert from 'node:assert/strict';
import child_process from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import test from 'node:test';

import FFmpeg from '../../src/ffmpeg.js';

test('Raspberry Pi hardware selection uses accessible encoder nodes without extra FFmpeg calls', async (t) => {
  let cases = [
    { name: 'encoder at video11 without video0', nodes: { video11: 'bcm2835-codec-encode' }, expected: true },
    { name: 'renumbered encoder', nodes: { video31: 'bcm2835-codec-encode' }, expected: true },
    { name: 'camera and decoder only', nodes: { video0: 'unicam', video10: 'bcm2835-codec-decode' }, expected: false },
    { name: 'image encoder only', nodes: { video0: 'bcm2835-codec-encode_image' }, expected: false },
    { name: 'encoder inaccessible', nodes: { video11: 'bcm2835-codec-encode' }, denied: true, expected: false },
    { name: 'missing sysfs on Pi', nodes: { video0: 'unicam' }, missingSysfs: true, expected: false },
    { name: 'missing encoder in FFmpeg', nodes: { video11: 'bcm2835-codec-encode' }, compiled: false, expected: false },
    { name: 'generic Linux retains existing check', nodes: { video0: 'generic' }, model: 'Generic board', expected: true },
    { name: 'missing model retains existing check', nodes: { video0: 'generic' }, model: null, expected: true },
  ];

  for (let scenario of cases) {
    await t.test(scenario.name, (t) => {
      t.mock.method(os, 'platform', () => 'linux');
      t.mock.method(fs, 'existsSync', (file) => file.startsWith('/dev/video') && file.slice(5) in scenario.nodes);
      t.mock.method(fs, 'readFileSync', (file) => {
        if (file === '/sys/firmware/devicetree/base/model' && scenario.model !== null) {
          return scenario.model ?? 'Raspberry Pi 4 Model B Rev 1.4\0';
        }
        let device = /^\/sys\/class\/video4linux\/(video\d+)\/name$/.exec(file)?.[1];
        if (device in scenario.nodes) {
          return scenario.nodes[device] + '\n';
        }
        throw new Error('Missing metadata');
      });
      t.mock.method(fs, 'readdirSync', (file) => {
        assert.equal(file, '/sys/class/video4linux');
        if (scenario.missingSysfs === true) {
          throw new Error('Missing sysfs');
        }
        return Object.keys(scenario.nodes);
      });
      t.mock.method(fs, 'accessSync', (file, mode) => {
        assert.equal(mode, fs.constants.R_OK | fs.constants.W_OK);
        if (scenario.denied === true || !(file.slice(5) in scenario.nodes)) {
          throw new Error('Device unavailable');
        }
      });
      let spawn = t.mock.method(child_process, 'spawnSync', (binary, args) => {
        assert.equal(binary, 'ffmpeg');
        return {
          status: 0,
          stdout: args[0] === '-version' ? 'ffmpeg version 8.0 ' : scenario.compiled === false ? '' : ' V..... h264_v4l2m2m',
        };
      });

      let ffmpeg = new FFmpeg('ffmpeg');
      assert.equal(ffmpeg.hardwareH264Codec, scenario.expected === true ? 'h264_v4l2m2m' : undefined);
      assert.deepEqual(spawn.mock.calls.map((call) => call.arguments[1]), [
        ['-version'], ['-encoders'], ['-decoders'], ['-muxers'], ['-demuxers'], ['-encoders'],
      ]);
    });
  }
});
