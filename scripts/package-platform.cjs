'use strict';
// Bundle an immutable, checksum-pinned runtime into a platform-specific VSIX.
const fs=require('node:fs/promises');
const path=require('node:path');
const {promisify}=require('node:util');
const exec=promisify(require('node:child_process').execFile);
const {downloadVerified}=require('../runtime-prebuilt.cjs');
const catalog=require('../runtime-manifest.json');
const targets={'linux-x64':'linux-x64','win32-x64':'win32-x64','darwin-arm64':'darwin-arm64'};
async function main(){
 const target=process.argv[2],asset=catalog.assets[target];
 if(!targets[target]||!asset)throw Error('Choose a bundled runtime target: '+Object.keys(targets).join(', '));
 const root=path.resolve(__dirname,'..'),directory=path.join(root,'bundled-runtime');
 try{await fs.mkdir(directory);}catch(error){if(error.code==='EEXIST')throw Error('bundled-runtime already exists; finish or clean the previous packaging job first.');throw error;}
 try{
  await downloadVerified(asset.url,path.join(directory,'runtime.tar.gz'),asset.sha256,asset.bytes,console.log);
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({...catalog,assets:{[target]:asset}},null,2));
  const out=path.resolve(process.argv[3]||path.join(root,'dist'));
  await fs.mkdir(out,{recursive:true});
  const version=require('../package.json').version;
  const output=path.join(out,`lodex-${version}-${target}.vsix`);
  const cli=require.resolve('@vscode/vsce/vsce');
  const result=await exec(process.execPath,[cli,'package','--target',targets[target],'--no-dependencies','--out',output],{cwd:root,timeout:600000,maxBuffer:4000000});
  console.log(result.stdout);console.log(output);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
