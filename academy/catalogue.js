/* Product-recognition batches use the existing Academy session and server grading. */
(() => {
 'use strict';
 const learner=document.getElementById('cataloguePanel'), admin=document.getElementById('catalogueAdmin'), results=document.getElementById('catalogueManagerResults');
 let attempt=null, next=null, testLocale='it', activeSeries=[], inventory=[];
 const api=(path,options={})=>window.AcademyAccount.request(path,options);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lang=()=>document.getElementById('languageSelect').value==='en'?'en':'it';
 const t=(it,en)=>lang()==='it'?it:en;
 const fieldNames={it:{series:'Serie',type:'Tipo di coltello',handle:'Materiale del manico',steel:'Acciaio della lama / anima',layers:'Numero di strati',use:'Uso appropriato',price:'Prezzo retail approssimativo (€)'},en:{series:'Series',type:'Knife type',handle:'Handle material',steel:'Blade / core steel',layers:'Layer count',use:'Appropriate use',price:'Approximate retail price (€)'}};
 const field=k=>fieldNames[testLocale][k]||k;
 function status(message,error=false){const el=learner.querySelector('[data-status]');if(el){el.textContent=message;el.className=error?'form-status form-status--error':'form-status';}}
 function shell(){learner.innerHTML=`<p class="eyebrow">${t('Test personale · Catalogo','Staff tests · Catalogue')}</p><h2>${t('Riconosci il coltello','Recognise the knife')}</h2><p>${t('Ogni batch propone fino a 5 coltelli casuali delle serie attive. Per ogni immagine rispondi su serie, tipo, manico, acciaio, strati, uso e prezzo. La correzione arriva dopo la conferma del coltello.','Each batch draws up to 5 random knives from active series. Identify the series, type, handle, steel, layers, use and price. Feedback follows each submitted knife.')}</p><p>${t('Prezzi: Retail Shop Price V15, tolleranza ±15%. I dati mancanti o discordanti non fanno punteggio.','Prices: V15 Retail Shop Price, ±15% tolerance. Missing or conflicting data is not scored.')}</p><p id="catalogueActive"></p><button type="button" class="button" id="catalogueStart">${t('Avvia nuovo batch','Start new batch')}</button> <button type="button" class="button button--quiet" id="catalogueResume" hidden>${t('Riprendi','Resume')}</button><p data-status role="status" aria-live="polite"></p><div id="catalogueQuestion"></div><div id="catalogueHistory"></div>`;
 learner.querySelector('#catalogueStart').onclick=start;
 learner.querySelector('#catalogueResume').onclick=()=>{if(attempt)renderCard(attempt.card);};
 }
 async function refresh(){
  if(!window.AcademyAccount.getUser())return;
  try{const data=await api('/api/catalogue/status');activeSeries=data.series;attempt=data.resume;testLocale=attempt?.locale||lang();
   learner.querySelector('#catalogueActive').textContent=t('Serie attive: ','Active series: ')+(activeSeries.map(s=>s.id).join(', ')||t('nessuna','none'));
   learner.querySelector('#catalogueStart').disabled=!activeSeries.length;
   learner.querySelector('#catalogueResume').hidden=!attempt;
   learner.querySelector('#catalogueHistory').innerHTML=`<details><summary>${t('Le mie ultime prove','My recent attempts')}</summary>${historyTable(data.attempts)}</details>`;
  }catch(e){status(e.message,true);}
 }
 function historyTable(rows,manager=false){return `<div class="table-wrap"><table><thead><tr>${manager?'<th>Commesso / Learner</th>':''}<th>Data / Date</th><th>Serie / Series</th><th>Coltelli / Knives</th><th>Risultato / Score</th><th>Competenze / Skills</th></tr></thead><tbody>${rows.map(r=>`<tr>${manager?`<td>${esc(r.name)}</td>`:''}<td>${esc(new Date(r.startedAt*1000).toLocaleString())}</td><td>${esc(r.series.join(', '))}</td><td>${r.answered}/${r.knives}</td><td>${Math.round(r.score*100)}% ${r.answered<r.knives?'(parziale / partial)':''}</td><td>${Object.entries(r.dimensions).map(([k,v])=>`${esc(fieldNames[lang()][k])}: ${v.correct}/${v.total}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>`;}
 async function start(){
  const b=learner.querySelector('#catalogueStart');b.disabled=true;status(t('Preparazione…','Preparing…'));
  try{attempt=await api('/api/catalogue/start',{method:'POST',body:JSON.stringify({locale:lang()})});testLocale=attempt.locale;renderCard(attempt.card);status('');learner.querySelector('#catalogueResume').hidden=true;}
  catch(e){status(e.message,true);}finally{b.disabled=!activeSeries.length;}
 }
 function renderCard(card){
  attempt.card=card;
  const photo=card.image+(card.image.includes('?')?'&':'?')+'v=20261019-hd';
  const host=learner.querySelector('#catalogueQuestion');
  host.innerHTML=`<form id="catalogueAnswer" class="catalogue-test"><h3 tabindex="-1">${testLocale==='it'?'Coltello':'Knife'} ${card.index+1} / ${card.total}</h3><figure class="catalogue-photo"><img src="${esc(photo)}" alt="${testLocale==='it'?'Coltello da riconoscere':'Knife to identify'}"><figcaption><button type="button" class="button button--quiet" id="catalogueZoom">${testLocale==='it'?'Ingrandisci immagine':'Enlarge image'}</button></figcaption></figure><div class="catalogue-fields">${card.fields.map(f=>`<fieldset><legend>${esc(field(f.key))}</legend>${f.options.map(o=>`<label><input type="radio" name="${esc(f.key)}" value="${esc(o.id)}" required> <span>${esc(o.label)}</span></label>`).join('')}</fieldset>`).join('')}${card.askPrice?`<label class="catalogue-price">${esc(field('price'))}<input name="price" type="number" step="0.01" min="0" required inputmode="decimal" placeholder="€"></label>`:`<p>${testLocale==='it'?'Prezzo retail non disponibile: domanda non valutata.':'Retail price unavailable: not scored.'}</p>`}</div><p data-answer-status role="status"></p><button class="button" type="submit">${testLocale==='it'?'Conferma e vedi la correzione':'Submit and see feedback'}</button></form>`;
  const img=host.querySelector('img');img.onerror=()=>{host.querySelector('button[type=submit]').disabled=true;host.querySelector('[data-answer-status]').textContent=t('Immagine non disponibile. Ricarica per riprendere; nessuna risposta è stata inviata.','Image unavailable. Reload to resume; no answer has been submitted.');};
  host.querySelector('#catalogueZoom').onclick=()=>openPhoto(photo);
  host.querySelector('form').onsubmit=submit;
  host.querySelector('h3').focus();
 }
 function openPhoto(src){
  const dialog=document.createElement('dialog');dialog.className='catalogue-zoom';
  dialog.setAttribute('aria-label',testLocale==='it'?'Immagine ingrandita del coltello':'Enlarged knife image');
  dialog.innerHTML=`<div class="catalogue-zoom-toolbar"><button type="button" class="button" data-close>${testLocale==='it'?'Chiudi':'Close'}</button><button type="button" class="button button--quiet" data-size>${testLocale==='it'?'Dimensione originale':'Original size'}</button></div><div class="catalogue-zoom-scroll"><img src="${esc(src)}" alt="${testLocale==='it'?'Coltello da riconoscere':'Knife to identify'}"></div>`;
  document.body.append(dialog);dialog.showModal();
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-size]').onclick=e=>{const full=dialog.classList.toggle('catalogue-zoom--original');e.currentTarget.textContent=full?(testLocale==='it'?'Adatta allo schermo':'Fit to screen'):(testLocale==='it'?'Dimensione originale':'Original size');};
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{dialog.remove();document.getElementById('catalogueZoom')?.focus();},{once:true});
 }
 async function submit(event){event.preventDefault();const form=event.currentTarget;const b=form.querySelector('button[type=submit]');b.disabled=true;
  const answers=Object.fromEntries(new FormData(form));if(attempt.card.askPrice)answers.price=Number(answers.price);
  try{const data=await api('/api/catalogue/answer',{method:'POST',body:JSON.stringify({attemptId:attempt.attemptId,index:attempt.card.index,answers})});next=data.next;
   const r=data.result;const host=learner.querySelector('#catalogueQuestion');
   host.innerHTML=`<div class="catalogue-feedback"><h3 tabindex="-1">${esc(r.sku)} · ${r.correct}/${r.total}</h3><ul>${r.details.map(d=>`<li><strong>${d.correct?'✓':'✕'} ${esc(field(d.key))}:</strong> ${esc(d.expected)}</li>`).join('')}</ul>${(r.notes||[]).map(n=>`<p>${esc(n)}</p>`).join('')}<p>${testLocale==='it'?'Fonte':'Source'}: V15, ${testLocale==='it'?'riga':'row'} ${r.sourceRow}${r.sourcePage?`; PDF p. ${r.sourcePage}`:''}.</p>${data.done?`<h3>${testLocale==='it'?'Batch completato':'Batch completed'}: ${Math.round(data.summary.score*100)}%</h3>${historyTable([data.summary])}`:`<button class="button" id="catalogueNext" type="button">${testLocale==='it'?'Prossimo coltello':'Next knife'} →</button>`}</div>`;
   host.querySelector('h3').focus();
   if(next)host.querySelector('#catalogueNext').onclick=()=>renderCard(next);
   else{attempt=null;await refresh();}
  }catch(e){form.querySelector('[data-answer-status]').textContent=e.message;b.disabled=false;}
 }
 async function refreshManager(){
  const u=window.AcademyAccount.getUser();if(!u||!['manager','admin'].includes(u.role))return;
  admin.hidden=u.role!=='admin';
  try{const data=await api('/api/manager/catalogue/results');results.innerHTML=`<h2>${t('Risultati · Riconoscimento prodotti','Results · Product recognition')}</h2>${historyTable(data.attempts,true)}`;}catch(e){results.textContent=e.message;}
  if(u.role==='admin')try{
   const data=await api('/api/admin/catalogue/series');inventory=data.series;
   admin.innerHTML=`<h2>${t('Serie abilitate nei test','Enabled test series')}</h2><p>${t('Le modifiche valgono per i nuovi batch. Le prove già iniziate conservano i coltelli estratti. Le altre prove della Academy restano disponibili.','Changes apply to new batches. Existing attempts keep their selected knives. Other Academy tests remain available.')}</p><label>${t('Cerca serie o modello','Search series or model')} <input id="catalogueFilter" type="search"></label><p id="catalogueAdminStatus" role="status" aria-live="polite"></p><div id="catalogueSeries"></div>`;
   admin.querySelector('#catalogueFilter').oninput=renderSeries;renderSeries();
  }catch(e){admin.textContent=e.message;}
 }
 function renderSeries(){const filter=admin.querySelector('#catalogueFilter').value.trim().toUpperCase();
  admin.querySelector('#catalogueSeries').innerHTML=inventory.filter(s=>s.id.includes(filter)||(s.products||[]).some(p=>p.sku.toUpperCase().includes(filter))).map(s=>`<div class="catalogue-series-row"><label><input type="checkbox" data-series="${esc(s.id)}" ${s.enabled?'checked':''}> <strong>${esc(s.id)}</strong> · ${s.models} ${t('modelli','models')}</label><details><summary>${t('Modelli e dati da verificare','Models and data review')}</summary><div class="table-wrap"><table><thead><tr><th>SKU</th><th>Retail €</th><th>${t('Note','Notes')}</th></tr></thead><tbody>${(s.products||[]).map(p=>`<tr><td>${esc(p.sku)}</td><td>${p.price===null?'—':p.price.toFixed(2)}</td><td>${esc([...(p.notes||[]),...(p.price===null?[t('Prezzo assente: non valutato','Price missing: not scored')]:[]),...(p.steel===null?[t('Acciaio non valutato','Steel not scored')]:[])].join(' · '))}</td></tr>`).join('')}</tbody></table></div></details></div>`).join('');
  admin.querySelectorAll('[data-series]').forEach(box=>box.onchange=async()=>{box.disabled=true;const value=box.checked;
   try{await api('/api/admin/catalogue/series',{method:'PATCH',body:JSON.stringify({id:box.dataset.series,enabled:value})});inventory.find(s=>s.id===box.dataset.series).enabled=value;admin.querySelector('#catalogueAdminStatus').textContent=`${box.dataset.series}: ${value?t('attiva','enabled'):t('disattivata','disabled')} · ${t('salvato','saved')}`;await refresh();}
   catch(e){box.checked=!value;admin.querySelector('#catalogueAdminStatus').textContent=e.message;}finally{box.disabled=false;}
  });
 }
 function auth(user){learner.hidden=!user;if(user){shell();refresh();}else{learner.innerHTML='';admin.innerHTML='';results.innerHTML='';admin.hidden=true;attempt=null;}}
 window.addEventListener('academy-auth-state',e=>auth(e.detail.user));
 window.addEventListener('academy-manager-refresh',refreshManager);
 document.getElementById('languageSelect').addEventListener('change',()=>{if(!attempt&&window.AcademyAccount.getUser()){shell();refresh();}});
 if(window.AcademyAccount?.getUser())auth(window.AcademyAccount.getUser());
})();
