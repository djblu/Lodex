import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import html from '../ui.cjs';
test('approval buttons sit outside previews and send one decision for standalone and grouped tools',async()=>{
 const dom=new JSDOM(html({nonce:'test',script:'chat.js',style:'chat.css',highlight:'code.js',source:'self'}),{runScripts:'outside-only'});
 try{
  const w=dom.window,sent=[];w.acquireVsCodeApi=()=>({postMessage:m=>sent.push(m)});
  w.eval(await readFile(new URL('../media/chat.js',import.meta.url),'utf8'));
  const emit=tool=>w.dispatchEvent(new w.MessageEvent('message',{data:{type:'tool',tool}}));
  const file={id:'file',name:'write',state:'proposed',args:{file_path:'index.html',content:'long content\n'.repeat(2000)}};
  emit(file);
  let card=w.document.querySelector('.tool'),actions=card.querySelector('.approval-actions');
  assert.equal(actions.previousElementSibling.className,'approval-preview');
  assert.equal(actions.parentElement,card);assert.equal(card.querySelector('.approval-preview button'),null);
  assert.equal(card.open,true);actions.querySelector('button').click();
  assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1))),{type:'approve',callId:'file',decision:'approve'});
  assert.ok([...actions.querySelectorAll('button')].every(b=>b.disabled));
  emit({...file,state:'done'});assert.equal(w.document.querySelector('.approval-actions'),null);
  emit({id:'shell',name:'bash',state:'proposed',args:{command:'echo test'}});
  card=w.document.querySelector('.tool[data-state="proposed"]');actions=card.querySelector('.approval-actions');
  assert.ok(card.closest('.command-group'));assert.equal(actions.previousElementSibling.className,'approval-preview');
  assert.ok(card.querySelector('.approval-preview .shell-panel'));
  actions.querySelectorAll('button')[1].click();assert.equal(sent.at(-1).decision,'deny');assert.equal(sent.at(-1).callId,'shell');
  emit({id:'shell',name:'bash',state:'denied'});assert.equal(w.document.querySelector('.approval-actions'),null);
 }finally{dom.window.close();}
});
