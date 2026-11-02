import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import html from '../ui.cjs';
test('context ring shows used percentage beside model, keeps counts on hover and handles compaction/unknown values',async()=>{
 const dom=new JSDOM(html({nonce:'test',script:'chat.js',style:'chat.css',highlight:'code.js',source:'self'}),{runScripts:'outside-only'});
 try{
  const w=dom.window,$=id=>w.document.getElementById(id);
  w.acquireVsCodeApi=()=>({postMessage(){}});
  w.eval(await readFile(new URL('../media/chat.js',import.meta.url),'utf8'));
  const emit=(used,max=262144)=>w.dispatchEvent(new w.MessageEvent('message',{data:{type:'contextInfo',used,max}}));
  assert.equal($('context-usage').nextElementSibling,$('model-settings'));
  assert.equal($('context-percent').textContent,'—');
  emit(7476);assert.equal($('context-percent').textContent,'3%');assert.equal($('context-limit').textContent,'262k');
  assert.match($('context-usage').title,/7,476 \/ 262,144 tokens · 254,668 left/);
  assert.equal($('context-progress').getAttribute('stroke-dasharray'),'3 100');
  const meter=$('context-usage').querySelector('[role="meter"]');
  emit(196608);assert.equal(meter.getAttribute('aria-valuenow'),'75');
  emit(262144);assert.equal($('context-percent').textContent,'100%');
  emit(999999);assert.equal(meter.getAttribute('aria-valuenow'),'100');
  emit(0);assert.equal($('context-percent').textContent,'0%');
  emit(0,32768);assert.equal($('context-limit').textContent,'33k');
  emit(0,128000);assert.equal($('context-limit').textContent,'128k');
  emit(undefined);assert.equal($('context-percent').textContent,'—');assert.equal(meter.hasAttribute('aria-valuenow'),false);
  assert.equal($('context-progress').getAttribute('stroke-dasharray'),'0 100');
 }finally{dom.window.close();}
});
