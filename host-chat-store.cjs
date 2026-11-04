'use strict';
const fs=require('node:fs/promises');
const sync=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const valid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(id);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
class HostChatStore {
 constructor(dir){this.dir=dir;this.queue=Promise.resolve();this.observed=new Map();}
 static async open(dir){await fs.mkdir(dir,{recursive:true,mode:0o700});return new HostChatStore(dir);}
 index(){try{return JSON.parse(sync.readFileSync(path.join(this.dir,'index.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
 list(){return Object.values(this.index()).filter(c=>!c.deleted).map(({file,revision,...meta})=>meta).sort((a,b)=>b.updatedAt-a.updatedAt);}
 async load(id){if(!valid(id))throw Error('Invalid chat identifier');const entry=this.index()[id];if(!entry||entry.deleted)return undefined;const chat=JSON.parse(await fs.readFile(path.join(this.dir,entry.file),'utf8'));this.observed.set(id,{revision:entry.revision,digest:digest(chat)});return chat;}
 enqueue(fn){const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
 async locked(fn){
  const lock=path.join(this.dir,'.write-lock');const start=Date.now();
  for(;;){try{await fs.mkdir(lock,{mode:0o700});await fs.writeFile(path.join(lock,'owner'),String(process.pid));break;}catch(e){if(e.code!=='EEXIST')throw e;
   try{const pid=Number(await fs.readFile(path.join(lock,'owner'),'utf8'));if(pid>0){try{process.kill(pid,0);}catch(err){if(err.code==='ESRCH')await fs.rm(lock,{recursive:true,force:true});}}}catch(err){if(err.code!=='ENOENT')throw err;try{const st=await fs.stat(lock);if(Date.now()-st.mtimeMs>30000)await fs.rm(lock,{recursive:true,force:true});}catch(e){if(e.code!=='ENOENT')throw e;}}
   if(Date.now()-start>10000)throw Error('Chat storage is busy in another window. Try again.');await sleep(30);
  }}
  try{return await fn();}finally{await fs.rm(lock,{recursive:true,force:true});}
 }
 async atomic(file,value){const temp=path.join(this.dir,'.tmp-'+randomUUID());try{await fs.writeFile(temp,JSON.stringify(value),{mode:0o600,flag:'wx'});await fs.rename(temp,path.join(this.dir,file));}finally{await fs.rm(temp,{force:true});}}
 save(chat,metadata){const snapshot=structuredClone(chat);if(!valid(snapshot.id)||!Array.isArray(snapshot.transcript))return Promise.reject(Error('Invalid saved chat'));
  return this.enqueue(()=>this.locked(async()=>{
   const index=this.index(),old=index[snapshot.id];if(old?.deleted)return;
   const observed=this.observed.get(snapshot.id),hash=digest(snapshot);
   if(old&&observed?.digest===hash)return; // Merely viewing an old copy must not overwrite another device's update.
   if(old&&observed?.revision!==old.revision)throw Error('This chat changed in another window. Reopen the chat before editing it.');
   const revision=randomUUID(),file=snapshot.id+'.'+revision+'.json';
   const title=old?.customTitle?old.title:(metadata?.title||snapshot.transcript.find(e=>e.role==='user')?.text?.replace(/\s+/g,' ').trim().slice(0,80)||old?.title||'New chat');
   await this.atomic(file,snapshot);
   index[snapshot.id]={id:snapshot.id,title,customTitle:old?.customTitle||metadata?.customTitle||false,updatedAt:metadata?.updatedAt||Date.now(),revision,file};
   await this.atomic('index.json',index);this.observed.set(snapshot.id,{revision,digest:hash});
   if(old?.file)await fs.rm(path.join(this.dir,old.file),{force:true});
  }));
 }
 remove(id){return this.enqueue(()=>this.locked(async()=>{const index=this.index(),old=index[id];if(!old)return;index[id]={id,deleted:true};await this.atomic('index.json',index);if(old.file)await fs.rm(path.join(this.dir,old.file),{force:true});this.observed.delete(id);}));}
 rename(id,title){return this.enqueue(()=>this.locked(async()=>{const index=this.index();if(!index[id]||index[id].deleted)throw Error('Chat not found');index[id]={...index[id],title,customTitle:true};await this.atomic('index.json',index);}));}
 async migrate(state,recovered=[]){
  const local=state.get('savedChats',[]),candidates=local.map(meta=>({chat:state.get('savedChat:'+meta.id),meta}));
  const activeId=state.get('activeChat');if(activeId)candidates.push({chat:state.get('savedChat:'+activeId)});
  const legacyId=state.get('chatId');if(legacyId&&state.get('transcript'))candidates.push({chat:{id:legacyId,transcript:state.get('transcript'),contextInfo:state.get('contextInfo',{}),mode:'manual'}});
  for(const item of recovered){const {recoveredTitle,...chat}=item;candidates.push({chat,meta:{title:recoveredTitle,customTitle:true,updatedAt:Math.max(0,...chat.transcript.map(e=>Number(e.timestamp)||0))}});}
  for(const {chat,meta} of candidates){if(!chat||this.index()[chat.id])continue;try{await this.save(chat,meta);}catch(e){if(!this.index()[chat.id])throw e;}}
 }
 watch(callback){const watcher=sync.watch(this.dir,(_,file)=>{if(file==='index.json')callback();});return {dispose:()=>watcher.close()};}
}
module.exports={HostChatStore};
