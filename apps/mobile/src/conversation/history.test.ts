/// <reference types="node" />
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { appendTurn, contextMessages, parseSavedConversation } from './history.ts';
import type { ExplainRequest, ExplainResponse } from '../types/tutor';
const request:ExplainRequest={question:'Why do things fall?',topic:null,language:'english',difficulty:'simple',style:'friend',action:'explain'};
const response:ExplainResponse={request_id:'answer-1',topic:null,language:'english',explanation:'Gravity pulls things toward Earth.',example:'Drop a ball.',key_points:['Gravity is a force.'],source_ids:[],provider:'gemini'};
it('sends the previous question and complete answer in chronological roles',()=>{
 const turns=appendTurn([],request,response);const messages=contextMessages(turns);
 assert.deepEqual(messages,[{role:'user',content:request.question},{role:'assistant',content:'Gravity pulls things toward Earth.\nDrop a ball.\nGravity is a force.'}]);
 assert.deepEqual(parseSavedConversation(JSON.stringify(turns)),turns);
});
it('bounds model context without recursively saving earlier request histories',()=>{
 let turns=appendTurn([],{...request,history:[{role:'user',content:'prior'}]},response);
 for(let n=0;n<60;n++)turns=appendTurn(turns,{...request,question:'Q'+n},{...response,request_id:'a'+n,explanation:'x'.repeat(5000)});
 assert.equal(turns.length,50);assert.equal(contextMessages(turns).length,12);
 assert.equal(contextMessages(turns)[0].content,'Q54');assert.equal(contextMessages(turns)[11].content.length,4000);
 assert.ok(turns.every(turn=>!('history' in turn.request)));
});
it('recovers safely from missing, malformed and invalid saved conversations',()=>{
 for(const raw of [null,'broken','{}','[{}]',JSON.stringify([{id:'x',request:{question:'Q'},response:{explanation:'A'}}])])assert.deepEqual(parseSavedConversation(raw),[]);
 assert.deepEqual(contextMessages([]),[]);
});
