import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {HARNESS,pinnedHarness} from '../runtime-setup.cjs';
test('automatic legacy reuse requires the pinned harness version',async()=>{
 const harnessPath=await fs.mkdtemp(path.join(os.tmpdir(),'lodex-version-'));
 try{
  assert.equal(await pinnedHarness({harnessPath}),false);
  await fs.writeFile(path.join(harnessPath,'package.json'),JSON.stringify({version:'0.2.1-alpha.3'}));
  assert.equal(await pinnedHarness({harnessPath}),false);
  await fs.writeFile(path.join(harnessPath,'package.json'),JSON.stringify({version:HARNESS}));
  assert.equal(await pinnedHarness({harnessPath}),true);
 }finally{await fs.rm(harnessPath,{recursive:true,force:true});}
});
