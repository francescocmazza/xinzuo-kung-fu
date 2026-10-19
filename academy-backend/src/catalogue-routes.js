import {CATALOGUE,selectProducts,buildCard,publicCard,gradeCard} from './catalogue-bank.js';
export async function catalogueRoute(request,env,ctx){
 const {authenticate,bodyJson,apiJson,HttpError,now}=ctx;
 const path=new URL(request.url).pathname;const admin=path.startsWith('/api/admin/');const manager=path.startsWith('/api/manager/');
 const {user}=await authenticate(request,env,admin?['admin']:manager?['manager','admin']:null);
 const settings=async()=>{
  const rows=await env.DB.prepare('SELECT * FROM catalogue_series_settings').all();const overrides=new Map(rows.results.map(r=>[r.series_id,Boolean(r.enabled)]));
  return CATALOGUE.series.map(s=>({id:s.id,brand:s.brand,enabled:overrides.has(s.id)?overrides.get(s.id):s.defaultEnabled,models:CATALOGUE.products.filter(p=>p.series===s.id).length,ready:CATALOGUE.products.filter(p=>p.series===s.id&&p.quizReady!==false).length,...(admin?{products:CATALOGUE.products.filter(p=>p.series===s.id).map(p=>({sku:p.sku,price:p.price,notes:p.notes,steel:p.steel,quizReady:p.quizReady}))}:{})}));
 };
 const summary=row=>{const state=JSON.parse(row.state_json);const dimensions={};for(const r of state.results)for(const d of r.details){dimensions[d.key]??={correct:0,total:0};dimensions[d.key].correct+=Number(d.correct);dimensions[d.key].total++;}
 const correct=state.results.reduce((s,r)=>s+r.correct,0),total=state.results.reduce((s,r)=>s+r.total,0);
 return {id:row.id,startedAt:row.started_at,completedAt:row.completed_at,answered:state.results.length,knives:state.cards.length,score:total?correct/total:0,dimensions,series:[...new Set(state.cards.map(c=>c.series))],name:row.name};};
 // Access is explicit, including administrators wishing to take a test themselves.
 if(!admin&&!manager){
  const grant=await env.DB.prepare('SELECT enabled FROM catalogue_user_access WHERE user_id=?').bind(user.id).first();
  if(!grant?.enabled){
   if(path==='/api/catalogue/status'&&request.method==='GET')return apiJson(request,env,{allowed:false});
   throw new HttpError(403,'catalogue_access_denied','Test riservato allo staff abilitato dall’amministratore. / Administrator approval is required for this staff test.');
  }
 }
 if(path==='/api/admin/catalogue/people'&&request.method==='GET'){
  const rows=await env.DB.prepare(`WITH scores AS (
   SELECT a.user_id,a.started_at,
    CASE WHEN json_array_length(a.state_json,'$.results')=json_array_length(a.state_json,'$.cards') THEN 1 ELSE 0 END AS finished,
    (SELECT COALESCE(SUM(json_extract(j.value,'$.correct')),0) FROM json_each(a.state_json,'$.results') j) AS correct,
    (SELECT COALESCE(SUM(json_extract(j.value,'$.total')),0) FROM json_each(a.state_json,'$.results') j) AS total
   FROM catalogue_attempts a
  ), totals AS (
   SELECT user_id,COUNT(*) AS sessions,SUM(finished) AS completed,
    SUM(CASE WHEN finished=1 THEN correct ELSE 0 END) AS correct,
    SUM(CASE WHEN finished=1 THEN total ELSE 0 END) AS total,MAX(started_at) AS last_attempt
   FROM scores GROUP BY user_id
  ) SELECT u.id,u.first_name||' '||u.last_name AS name,u.email,u.phone,u.active,
   COALESCE(g.enabled,0) AS enabled,COALESCE(t.sessions,0) AS sessions,COALESCE(t.completed,0) AS completed,
   CASE WHEN t.total>0 THEN 1.0*t.correct/t.total ELSE NULL END AS score,t.last_attempt AS lastAttempt
   FROM users u LEFT JOIN catalogue_user_access g ON g.user_id=u.id LEFT JOIN totals t ON t.user_id=u.id
   ORDER BY u.last_name,u.first_name,u.id`).all();
  return apiJson(request,env,{people:rows.results});
 }
 if(path==='/api/admin/catalogue/people'&&request.method==='PATCH'){
  const body=await bodyJson(request);
  if(typeof body.id!=='string'||typeof body.enabled!=='boolean')throw new HttpError(400,'invalid_access','Invalid user or enabled flag.');
  const target=await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(body.id).first();
  if(!target)throw new HttpError(404,'not_found','User not found.');
  await env.DB.prepare('INSERT INTO catalogue_user_access(user_id,enabled,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(body.id,Number(body.enabled),now(),user.id).run();
  return apiJson(request,env,{ok:true,id:body.id,enabled:body.enabled});
 }
 if(path==='/api/admin/catalogue/person'&&request.method==='GET'){
  const query=new URL(request.url).searchParams;const id=query.get('id');
  const offset=Number(query.get('offset')||0);
  if(!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'invalid_offset','Invalid offset.');
  const person=await env.DB.prepare("SELECT id,first_name||' '||last_name AS name FROM users WHERE id=?").bind(id||'').first();
  if(!person)throw new HttpError(404,'not_found','User not found.');
  const rows=await env.DB.prepare('SELECT * FROM catalogue_attempts WHERE user_id=? ORDER BY started_at DESC,rowid DESC LIMIT 51 OFFSET ?').bind(id,offset).all();
  const skills=await env.DB.prepare(`SELECT json_extract(d.value,'$.key') AS key,
   SUM(json_extract(d.value,'$.correct')) AS correct,COUNT(*) AS total
   FROM catalogue_attempts a,json_each(a.state_json,'$.results') r,json_each(r.value,'$.details') d
   WHERE a.user_id=? AND json_array_length(a.state_json,'$.results')=json_array_length(a.state_json,'$.cards')
   GROUP BY json_extract(d.value,'$.key')`).bind(id).all();
  return apiJson(request,env,{person,attempts:rows.results.slice(0,50).map(summary),skills:skills.results,nextOffset:rows.results.length>50?offset+50:null});
 }
 if(path==='/api/admin/catalogue/series'&&request.method==='GET')return apiJson(request,env,{series:await settings(),version:CATALOGUE.version});
 if(path==='/api/admin/catalogue/series'&&request.method==='PATCH'){
  const body=await bodyJson(request);if(!CATALOGUE.series.some(s=>s.id===body.id)||typeof body.enabled!=='boolean')throw new HttpError(400,'invalid_series','Invalid series or enabled flag.');
  await env.DB.prepare('INSERT INTO catalogue_series_settings(series_id,enabled,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(series_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(body.id,Number(body.enabled),now(),user.id).run();
  return apiJson(request,env,{ok:true,id:body.id,enabled:body.enabled});
 }
 if(path==='/api/manager/catalogue/results'&&request.method==='GET'){
  const rows=await env.DB.prepare("SELECT a.*,u.first_name||' '||u.last_name AS name FROM catalogue_attempts a JOIN users u ON u.id=a.user_id ORDER BY a.started_at DESC,a.rowid DESC LIMIT 100").all();
  return apiJson(request,env,{attempts:rows.results.map(summary)});
 }
 if(path==='/api/catalogue/status'&&request.method==='GET'){
  const rows=await env.DB.prepare('SELECT * FROM catalogue_attempts WHERE user_id=? ORDER BY started_at DESC,rowid DESC LIMIT 20').bind(user.id).all();
  const active=rows.results.find(r=>!r.completed_at&&now()-r.started_at<7200);let resume=null;
  if(active){const state=JSON.parse(active.state_json);resume={attemptId:active.id,locale:state.locale,card:publicCard(state.cards[state.results.length],state.results.length,state.cards.length)};}
  return apiJson(request,env,{allowed:true,series:(await settings()).filter(s=>s.enabled),attempts:rows.results.map(summary),resume});
 }
 if(path==='/api/catalogue/start'&&request.method==='POST'){
  const body=await bodyJson(request);const locale=body.locale==='en'?'en':'it';
  const previous=await env.DB.prepare('SELECT * FROM catalogue_attempts WHERE user_id=? ORDER BY started_at DESC,rowid DESC LIMIT 1').bind(user.id).first();
  const previousIds=previous?JSON.parse(previous.state_json).cards.map(c=>c.productId):[];
  const enabled=new Set((await settings()).filter(s=>s.enabled).map(s=>s.id));
  const products=selectProducts(enabled,previousIds,10);
  if(products.length<10)throw new HttpError(409,'insufficient_models','Servono almeno 10 modelli disponibili nelle serie attive. Contatta l’amministratore. / Enable series with at least 10 available models.');
  const state={locale,cards:products.map(p=>buildCard(p,locale)),results:[]};const id=crypto.randomUUID();
  await env.DB.batch([
   env.DB.prepare('UPDATE catalogue_attempts SET completed_at=? WHERE user_id=? AND completed_at IS NULL').bind(now(),user.id),
   env.DB.prepare('INSERT INTO catalogue_attempts(id,user_id,version,started_at,state_json) VALUES(?,?,?,?,?)').bind(id,user.id,CATALOGUE.version,now(),JSON.stringify(state))
  ]);
  return apiJson(request,env,{attemptId:id,locale,card:publicCard(state.cards[0],0,state.cards.length)},201);
 }
 if(path==='/api/catalogue/answer'&&request.method==='POST'){
  const body=await bodyJson(request);
  const row=await env.DB.prepare('SELECT * FROM catalogue_attempts WHERE id=? AND user_id=?').bind(String(body.attemptId||''),user.id).first();
  if(!row)throw new HttpError(404,'not_found','Test not found.');
  if(row.completed_at||now()-row.started_at>7200)throw new HttpError(409,'test_closed','Test chiuso o scaduto. Avvia una nuova prova. / Test closed or expired. Start again.');
  const state=JSON.parse(row.state_json);const index=state.results.length;
  if(body.index!==index||!body.answers||typeof body.answers!=='object'||Array.isArray(body.answers))throw new HttpError(409,'invalid_step','Invalid step. Reload to resume.');
  const card=state.cards[index];
  for(const f of card.fields)if(!f.options.some(o=>o.id===body.answers[f.key]))throw new HttpError(400,'missing_answer','Completa tutte le risposte. / Complete every answer.');
  if(card.price!==null && (typeof body.answers.price!=='number'||!Number.isFinite(body.answers.price)||body.answers.price<0))throw new HttpError(400,'invalid_price','Enter a valid price in euros.');
  const result=gradeCard(card,body.answers);state.results.push(result);const done=state.results.length===state.cards.length;
  const saved=await env.DB.prepare('UPDATE catalogue_attempts SET state_json=?,completed_at=? WHERE id=? AND user_id=? AND state_json=? AND completed_at IS NULL').bind(JSON.stringify(state),done?now():null,row.id,user.id,row.state_json).run();
  if(saved.meta.changes!==1)throw new HttpError(409,'already_answered','Risposta già salvata. Ricarica per riprendere. / Answer already saved. Reload to resume.');
  const updated={...row,state_json:JSON.stringify(state),completed_at:done?now():null};
  return apiJson(request,env,{result,done,summary:summary(updated),next:done?null:publicCard(state.cards[index+1],index+1,state.cards.length)});
 }
 throw new HttpError(404,'not_found','Catalogue endpoint not found.');
}
