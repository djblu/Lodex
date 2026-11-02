import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Lodex 1.0.0 uses its own extension, command and settings identities',async()=>{
 const p=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(p.name,'lodex');assert.equal(p.displayName,'Lodex');assert.equal(p.version,'1.0.0');
 assert.equal(p.repository.url,'https://github.com/djblu/Lodex.git');
 assert.ok(p.contributes.commands.every(c=>c.command.startsWith('lodex.')));
 assert.ok(Object.keys(p.contributes.configuration.properties).every(k=>k.startsWith('lodex.')));
 assert.equal(p.contributes.views['lodex'][0].name,'Lodex');
});
