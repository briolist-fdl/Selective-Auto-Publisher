import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildPublicDemoAudit } from '../src/publicDemoAudit.js';

const target={enabled:true,guildId:'1550119459891576852',sourceChannelId:'1557542302027874304',auditChannelId:'1557542556714139699'};
test('demo formatting requires the exact opt-in and all three channel/server boundaries',()=>{
 for(const [key,value] of [['enabled',false],['enabled','true'],['guildId','other'],['sourceChannelId','other'],['auditChannelId','other']]){
  assert.equal(buildPublicDemoAudit({...target,[key]:value,eventType:'published'}),null);
 }
});
test('published and skipped reasons produce the reviewed concise wording',()=>{
 for(const [eventType,reason,expected] of [
  ['published','matched','Published: the required phrase was found'],
  ['skipped','missing_allowed_keyword','Skipped: the required phrase was missing'],
  ['skipped','blocked_keyword','Skipped: a blocked phrase was found'],
  ['skipped','mode_mismatch','Skipped: this sender did not match the publishing rules'],
  ['failed','error','Failed: the post could not be published'],
 ])assert.equal(buildPublicDemoAudit({...target,eventType,filterResult:{reason}}).content,expected);
});
test('private content and error details are never read or rendered',()=>{
 const filterResult={reason:'blocked_keyword',get details(){throw new Error('private details accessed');}};
 const result=buildPublicDemoAudit({...target,eventType:'skipped',filterResult,content:'PRIVATE_SECRET',authorId:'PRIVATE_ID'});
 assert.equal(result.content,'Skipped: a blocked phrase was found');
 assert.deepEqual(result.allowedMentions,{parse:[]});
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
});

const source=fs.readFileSync(new URL('../index.js',import.meta.url),'utf8');
const auditBody=source.slice(source.indexOf('async function sendAuditLog('),source.indexOf('client.on("messageCreate"'));
async function runAudit({guildId=target.guildId,sourceChannelId=target.sourceChannelId,auditChannelId=target.auditChannelId,enabled='true',eventType='skipped',filterResult={reason:'blocked_keyword'}}={}){
 const sent=[];
 const channel={guildId,isTextBased:()=>true,send:async payload=>sent.push(payload)};
 const context=vm.createContext({buildPublicDemoAudit,process:{env:{BRIO_BOTS_DEMO_AUDIT_ENABLED:enabled}},pool:{query:async()=>({rows:[{audit_channel_id:auditChannelId}]})},client:{channels:{fetch:async()=>channel}},getCheckedContentTypes:()=>['message.content'],getSearchablePreview:()=> 'PRIVATE_PREVIEW',console:{error:()=>{}}});
 new vm.Script(auditBody+'\nglobalThis.audit=sendAuditLog;').runInContext(context);
 const message={guild:{id:guildId},channelId:sourceChannelId,id:'PRIVATE_MESSAGE_ID',author:{id:'PRIVATE_AUTHOR_ID',tag:'PRIVATE_AUTHOR',bot:false},embeds:[],webhookId:null};
 await context.audit(message,eventType,filterResult);
 return sent;
}
test('integrated demo branch sends no private fields or ID previews',async()=>{
 const sent=await runAudit();
 assert.equal(sent.length,1);
 assert.equal(sent[0].content,'Skipped: a blocked phrase was found');
 assert.equal(JSON.stringify(sent).includes('PRIVATE'),false);
});
test('Tundraheim and other channels retain the existing audit behavior',async()=>{
 for(const args of [{guildId:'TUNDRAHEIM'},{sourceChannelId:'another-source'},{auditChannelId:'another-audit'},{enabled:'false'}]){
  const sent=await runAudit(args);
  assert.equal(sent.length,1);
  assert.ok(sent[0].content.includes('PRIVATE_MESSAGE_ID'));
  assert.ok(sent[0].content.includes('PRIVATE_PREVIEW'));
 }
});
