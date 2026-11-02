'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {promisify}=require('node:util');
const {execFile}=require('node:child_process');
const {createHash}=require('node:crypto');
const exec=promisify(execFile);
const {runtimeLayout,runtimeEnvironment}=require('./runtime-platform.cjs');
const HARNESS='0.2.1-rc.5';
const NODE='24.22.1',COMMIT='96ca4383c7b05a8a3e6064c65d9e9977d4b3bb59';
const legacy={};
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function usable(c){return c.nodePath&&c.sourcePath&&c.harnessPath&&await exists(c.nodePath)&&await exists(path.join(c.sourcePath,'apps/host/server/agent/agent-bridge.mjs'))&&await exists(path.join(c.harnessPath,'lib/bin.js'));}
async function pinnedHarness(result){try{return JSON.parse(await fs.readFile(path.join(result.harnessPath,'package.json'),'utf8')).version===HARNESS;}catch{return false;}}
async function sourceReady(root,result){try{const m=JSON.parse(await fs.readFile(path.join(root,'ready.json'),'utf8'));return m.node===NODE&&m.lodex===COMMIT&&m.harness===HARNESS&&await usable(result);}catch{return false;}}
async function download(url){const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('Runtime download failed: HTTP '+r.status);return Buffer.from(await r.arrayBuffer());}
async function ensureSourceRuntime(base,overrides={},report=()=>{},{reuseLegacy=true}={}){
 if(await usable(overrides))return overrides;
 if(Object.values(overrides).some(Boolean))throw Error('Configured runtime paths are incomplete or missing. Clear all three runtime path overrides to use automatic setup.');
 if(reuseLegacy&&await usable(legacy)&&await pinnedHarness(legacy))return legacy;

 const root=path.join(base,'runtime-v1');await fs.mkdir(root,{recursive:true});
 const layout=runtimeLayout(root,NODE);
 const result={nodePath:layout.nodePath,sourcePath:path.join(root,'lodex'),harnessPath:path.join(root,'harness/node_modules/@deepseek-ai/dsh')};
 if(await sourceReady(root,result)){await applyCompatibility(result);return result;}

 if(!await exists(result.nodePath)){
  report('Downloading Node.js 24…');const file=layout.file,url=`https://nodejs.org/dist/v${NODE}/`;
  const sums=(await download(url+'SHASUMS256.txt')).toString();const expected=sums.split('\n').find(line=>line.endsWith('  '+file))?.split(' ')[0];
  const data=await download(url+file);if(!expected||createHash('sha256').update(data).digest('hex')!==expected)throw Error('Node.js download checksum did not match');
  const archive=path.join(root,file);await fs.writeFile(archive,data);if(layout.windows){
   await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath $env:LODEX_SETUP_ARCHIVE -DestinationPath $env:LODEX_SETUP_ROOT -Force"],{timeout:120000,windowsHide:true,env:{...process.env,LODEX_SETUP_ARCHIVE:archive,LODEX_SETUP_ROOT:root}});
  }else await exec('tar',['-xzf',archive,'-C',root],{timeout:120000});await fs.unlink(archive);
 }
 report('Installing the pinned Lodex bridge…');
 await fs.mkdir(result.sourcePath,{recursive:true});
 await fs.cp(path.join(__dirname,'bridge-source'),result.sourcePath,{recursive:true});
 report('Installing the pinned coding harness…');const harness=path.join(root,'harness');await fs.mkdir(harness,{recursive:true});
 await fs.writeFile(path.join(harness,'package.json'),JSON.stringify({private:true,dependencies:{'@deepseek-ai/dsh':HARNESS}}));
 // Rebuild only this installer-owned dependency tree on retry. The bridge's
 // compatibility symlink must not be present while npm reconciles dependencies.
 await fs.rm(path.join(harness,'node_modules'),{recursive:true,force:true});
 const logs=path.join(harness,'install-logs');await fs.mkdir(logs,{recursive:true});
 const started=Date.now();let downloads=0;
 const progress=setInterval(()=>report(`Installing coding harness · ${Math.floor((Date.now()-started)/1000)}s elapsed · ${downloads} registry requests completed (5-minute timeout)`),5000);
 try{
  const installation=exec(result.nodePath,[layout.npmPath,'install','--omit=dev','--no-audit','--no-fund','--loglevel=http','--logs-dir='+logs,'--fetch-retries=2','--fetch-timeout=30000'],{cwd:harness,timeout:300000,maxBuffer:8000000,windowsHide:true,env:runtimeEnvironment(layout.bin)});
  // Count request completions without exposing registry URLs or credentials in the UI.
  let pending='';installation.child.stderr.on('data',chunk=>{pending+=String(chunk);const lines=pending.split('\n');pending=lines.pop().slice(-4096);downloads+=lines.filter(line=>/npm http (fetch|cache)/.test(line)).length;});
  await installation;
 }catch(error){
  const reason=error.killed?'timed out after five minutes':error.code==='ENOENT'?'could not start Node.js':'failed';
  throw Error(`Coding harness installation ${reason}. Check the npm logs in ${logs}. Retry Connect to Lodex after checking network access to the npm registry.`);
 }finally{clearInterval(progress);}
 report('Checking the installed coding harness…');
 const nested=path.join(result.harnessPath,'node_modules');if(!await exists(nested))await fs.symlink(layout.windows?path.join(harness,'node_modules'):'../..',nested,layout.windows?'junction':'dir');
 if(!await usable(result))throw Error('Runtime installation is incomplete');
 await applyCompatibility(result);
 await fs.writeFile(path.join(root,'ready.json'),JSON.stringify({node:NODE,lodex:COMMIT,harness:HARNESS}));return result;
}
async function applyCompatibility(result){
 if(process.platform!=='win32')return;
 const file=path.join(result.sourcePath,'apps/host/server/agent/preset.mjs');
 const text=await fs.readFile(file,'utf8');
 if(text.includes('modelSelectionSettings: true'))await fs.writeFile(file,text.replaceAll('modelSelectionSettings: true','modelSelectionSettings: false'));
}
const installations=new Map();
function ensureRuntime(base,overrides={},report=()=>{},options={}){
 const key=JSON.stringify([path.resolve(base),overrides,options]);
 if(installations.has(key))return installations.get(key);
 const promise=(async()=>{
  if(await usable(overrides))return overrides;
  if(Object.values(overrides).some(Boolean))throw Error('Configured runtime paths are incomplete or missing. Clear all three runtime path overrides to use automatic setup.');
  if(options.reuseLegacy!==false&&await usable(legacy)&&await pinnedHarness(legacy))return legacy;
  // Keep existing installations; extension updates do not force another download.
  const root=path.join(base,'runtime-v1'),layout=runtimeLayout(root,NODE);
  const existing={nodePath:layout.nodePath,sourcePath:path.join(root,'lodex'),harnessPath:path.join(root,'harness/node_modules/@deepseek-ai/dsh')};
  if(await sourceReady(root,existing)){await applyCompatibility(existing);return existing;}
  // Reuse working installations before expanding a bundled runtime. An extension
  // update must not require a second runtime or extra disk space on existing hosts.
  const bundled=await require('./runtime-bundled.cjs').installBundled(base,report);
  if(bundled){await applyCompatibility(bundled);return bundled;}
  const {installPrebuilt}=require('./runtime-prebuilt.cjs');
  const result=await installPrebuilt(base,report);
  if(result){await applyCompatibility(result);return result;}
  report('Prebuilt runtime unavailable for this host; using source installation…');
  return ensureSourceRuntime(base,overrides,report,options);
 })().finally(()=>installations.delete(key));
 installations.set(key,promise);return promise;
}
module.exports={ensureRuntime,ensureSourceRuntime,usable,legacy,applyCompatibility,pinnedHarness,NODE,COMMIT,HARNESS};
