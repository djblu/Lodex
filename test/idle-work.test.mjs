import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import html from '../ui.cjs';
test('restoring an idle chat with interrupted commands leaves no repeating timers',async()=>{
 const dom=new JSDOM(html({nonce:'test',script:'chat.js',style:'chat.css',highlight:'code.js',source:'self'}),{runScripts:'outside-only'});
 try{
  const w=dom.window,timers=new Map();let id=0;
  w.setTimeout=fn=>{timers.set(++id,fn);return id;};w.clearTimeout=id=>timers.delete(id);
  w.acquireVsCodeApi=()=>({postMessage(){}});
  w.eval(await readFile(new URL('../media/chat.js',import.meta.url),'utf8'));
  w.dispatchEvent(new w.MessageEvent('message',{data:{type:'restore',busy:false,mode:'manual',transcript:[{role:'tool',text:JSON.stringify({id:'interrupted',name:'bash',state:'running',commandStartedAt:1000,args:{command:'npm test'}})}]}}));
  assert.equal(timers.size,0,'restored historical command must not keep ticking in an idle chat');
 }finally{dom.window.close();}
});
