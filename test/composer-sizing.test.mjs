import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import html from '../ui.cjs';
test('composer grows from two to fourteen visual lines, scrolls beyond the cap and shrinks on clear/edit',async()=>{
 const dom=new JSDOM(html({nonce:'test',script:'chat.js',style:'chat.css',highlight:'code.js',source:'self'}),{runScripts:'outside-only'});
 try{
  const w=dom.window,prompt=w.document.getElementById('prompt');
  prompt.style.cssText='line-height:20px;padding:10px 12px;box-sizing:border-box;border:0;';
  let visualLines=1;
  // JSDOM has no layout engine: simulate measured wrapped lines, independently
  // of newline count, to exercise the real input/event and height limits.
  Object.defineProperty(prompt,'scrollHeight',{get:()=>visualLines*20+20});
  w.acquireVsCodeApi=()=>({postMessage(){}});
  w.eval(await readFile(new URL('../media/chat.js',import.meta.url),'utf8'));
  const input=(lines,text='text')=>{visualLines=lines;prompt.value=text;prompt.dispatchEvent(new w.Event('input'));};
  const message=data=>w.dispatchEvent(new w.MessageEvent('message',{data}));
  assert.equal(prompt.style.height,'60px');assert.equal(prompt.style.overflowY,'hidden');
  input(8);assert.equal(prompt.style.height,'180px');
  input(14);assert.equal(prompt.style.height,'300px');assert.equal(prompt.style.overflowY,'hidden');
  input(20);assert.equal(prompt.style.height,'300px');assert.equal(prompt.style.overflowY,'auto');
  input(4);assert.equal(prompt.style.height,'100px');assert.equal(prompt.style.overflowY,'hidden');
  input(1,'');assert.equal(prompt.style.height,'60px');
  input(10,'sent');visualLines=1;message({type:'sendAccepted',text:'sent',attachmentIds:[]});
  assert.equal(prompt.value,'');assert.equal(prompt.style.height,'60px');
  input(10);visualLines=1;message({type:'restore',busy:false,transcript:[]});
  assert.equal(prompt.style.height,'60px');
  visualLines=6;w.dispatchEvent(new w.Event('resize'));assert.equal(prompt.style.height,'140px');
 }finally{dom.window.close();}
});
