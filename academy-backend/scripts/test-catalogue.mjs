import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import worker from '../src/worker.js';
import {CATALOGUE,buildCard,gradeCard,selectProducts} from '../src/catalogue-bank.js';
const root=fileURLToPath(new URL('../',import.meta.url));
export function testDatabase(){
 const db=new DatabaseSync(':memory:');
 for(const f of readdirSync(root+'migrations').sort())db.exec(readFileSync(root+'migrations/'+f,'utf8'));
 const prepare=sql=>{let args=[];return {bind(...a){args=a;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};};
 return {db,env:{DB:{prepare,async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}}};
}
export async function seed(db){
 const ts=Math.floor(Date.now()/1000);
 for(const [id,role] of [['admin','admin'],['learner','staff'],['other','staff'],['manager','manager']]){
 db.prepare('INSERT INTO users(id,email,first_name,last_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)').run(id,`${id}@test.invalid`,id,'Test',role,'unused','unused',100000,ts,ts);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));const hash=Buffer.from(digest).toString('base64url');
 db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?)').run(hash,id,ts,ts+86400,ts);
 }
}
export async function call(env,path,user='learner',body,method){
 const headers={'Content-Type':'application/json',Origin:'http://localhost:8000'};if(user)headers.Authorization=`Bearer ${user}`;
 const res=await worker.fetch(new Request('http://localhost:8000'+path,{method:method||(body?'POST':'GET'),headers,...(body?{body:JSON.stringify(body)}:{})}),env);
 return {status:res.status,data:await res.json()};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
const {db,env}=testDatabase();await seed(db);
assert.equal((await call(env,'/api/catalogue/status',null)).status,401);
assert.equal((await call(env,'/api/admin/catalogue/series')).status,403);
assert.equal((await call(env,'/api/admin/catalogue/series','manager')).status,403);
assert.equal((await call(env,'/api/manager/catalogue/results')).status,403);
assert.equal(CATALOGUE.series.length,64);assert.equal(CATALOGUE.products.length,475);
const active=CATALOGUE.series.filter(s=>s.defaultEnabled);assert.equal(active.length,15);
assert.equal(new Set(CATALOGUE.products.map(p=>p.sku)).size,CATALOGUE.products.length);
for(const p of CATALOGUE.products.filter(p=>p.quizReady)){
 assert.ok(existsSync(root+'../academy/'+p.image),p.sku);
 for(const locale of ['it','en']){
 const card=buildCard(p,locale);for(const f of card.fields){assert.equal(f.options.length,4);assert.equal(new Set(f.options.map(o=>o.label)).size,4,`${p.sku} ${f.key}`);}
 const answers=Object.fromEntries(card.fields.map(f=>[f.key,f.correct]));answers.price=p.price;
 const graded=gradeCard(card,answers);assert.equal(graded.correct,graded.total,p.sku);
 if(p.price!==null){answers.price=p.price*1.15;assert.ok(gradeCard(card,answers).details.at(-1).correct);answers.price=p.price*1.151;assert.ok(!gradeCard(card,answers).details.at(-1).correct);}
 }
}
let listing=await call(env,'/api/admin/catalogue/series','admin');assert.equal(listing.status,200);assert.equal(listing.data.series.length,64);
// Only enabled B35 can be selected, with no immediate repeats when enough alternatives exist.
for(const s of active)await call(env,'/api/admin/catalogue/series','admin',{id:s.id,enabled:s.id==='B35'},'PATCH');
assert.equal((await call(env,'/api/admin/catalogue/series','admin',{id:'NOPE',enabled:true},'PATCH')).status,400);
let start=await call(env,'/api/catalogue/start','learner',{locale:'it'});assert.equal(start.status,201);
let stored=JSON.parse(db.prepare('SELECT state_json FROM catalogue_attempts WHERE id=?').get(start.data.attemptId).state_json);
assert.ok(stored.cards.every(c=>c.series==='B35'));assert.equal(new Set(stored.cards.map(c=>c.productId)).size,5);
assert.ok(!JSON.stringify(start.data.card).includes('correct'));assert.ok(!('price' in start.data.card));assert.ok(!('sku' in start.data.card));
const resumed=await call(env,'/api/catalogue/status');assert.deepEqual(resumed.data.resume.card,start.data.card);
assert.equal((await call(env,'/api/catalogue/answer','other',{attemptId:start.data.attemptId,index:0,answers:{}})).status,404);
assert.equal((await call(env,'/api/catalogue/answer','learner',{attemptId:start.data.attemptId,index:0,answers:{}})).status,400);
const firstIds=stored.cards.map(c=>c.productId);
for(let index=0;index<5;index++){
 const card=stored.cards[index];const answers=Object.fromEntries(card.fields.map(f=>[f.key,f.correct]));answers.price=card.price;
 const response=await call(env,'/api/catalogue/answer','learner',{attemptId:start.data.attemptId,index,answers});assert.equal(response.status,200);assert.equal(response.data.result.correct,response.data.result.total);
 assert.equal(response.data.done,index===4);
 if(index===0)assert.equal((await call(env,'/api/catalogue/answer','learner',{attemptId:start.data.attemptId,index,answers})).status,409);
 if(index===4)assert.equal(response.data.summary.score,1);
}
start=await call(env,'/api/catalogue/start','learner',{locale:'en'});assert.equal(start.status,201);
stored=JSON.parse(db.prepare('SELECT state_json FROM catalogue_attempts WHERE id=?').get(start.data.attemptId).state_json);assert.ok(stored.cards.every(c=>!firstIds.includes(c.productId)));
await call(env,'/api/admin/catalogue/series','admin',{id:'B35',enabled:false},'PATCH');
assert.equal((await call(env,'/api/catalogue/start','learner',{locale:'it'})).status,409);
assert.equal((await call(env,'/api/catalogue/status')).data.resume.attemptId,start.data.attemptId);
assert.equal((await call(env,'/api/manager/catalogue/results','manager')).status,200);
assert.ok(selectProducts(new Set(['B12S']),[],5).length===1);
console.log(`PASS: ${CATALOGUE.products.filter(p=>p.quizReady).length} model cards in IT/EN; role protection, migrations, toggles, randomisation, no-repeat, answer secrecy, grading, resume, replay and ownership.`);
}
