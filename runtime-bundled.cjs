'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {installPrebuilt}=require('./runtime-prebuilt.cjs');
async function installBundled(base,report=()=>{},directory=path.join(__dirname,'bundled-runtime')){
 let catalog;
 try{catalog=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));}
 catch(error){if(error.code==='ENOENT')return null;throw error;}
 const platform=process.platform+'-'+process.arch;
 if(!catalog.assets?.[platform])throw Error('This Lodex package targets another platform. Install the VSIX matching this extension host.');
 return installPrebuilt(base,report,catalog,path.join(directory,'runtime.tar.gz'));
}
module.exports={installBundled};
