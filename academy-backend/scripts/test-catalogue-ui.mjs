import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import worker from '../src/worker.js';
import {testDatabase,seed} from './test-catalogue.mjs';
const {db,env}=testDatabase();await seed(db);
const root=fileURLToPath(new URL('../../academy/',import.meta.url));
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://127.0.0.1:8000').pathname;
 if(path.startsWith('/api/')){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const response=await worker.fetch(new Request('http://127.0.0.1:8000'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
 }
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root))throw new Error('path');
 let data=readFileSync(file);if(path==='/config.js')data=Buffer.from(data.toString().replace('apiBase: ""','apiBase: "http://127.0.0.1:8000"'));
 const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp'};
 res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);
 }catch(e){res.writeHead(500);res.end(e.message);}});
await new Promise(r=>server.listen(8000,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});const page=await browser.newPage({locale:'it-IT',viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8000')?route.continue():route.abort());
 await page.addInitScript(()=>sessionStorage.setItem('xinzuo-academy-session-token','admin'));
 await page.goto('http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
 await page.locator('#catalogueStart:not([disabled])').waitFor();
 await page.locator('#managerButton').click();await page.locator('[data-series="B13R"]').waitFor();
 assert.equal(await page.locator('[data-series]').count(),64);
 await page.locator('[data-series="B13R"]').uncheck();await page.locator('#catalogueAdminStatus').filter({hasText:'salvato'}).waitFor();
 assert.equal(db.prepare("SELECT enabled FROM catalogue_series_settings WHERE series_id='B13R'").get().enabled,0);
 await page.locator('#managerBack').click();await page.locator('#catalogueStart').click();
 await page.locator('#catalogueAnswer').waitFor();
 await page.waitForFunction(()=>{const img=document.querySelector('#catalogueAnswer img');return img?.complete&&img.naturalWidth>=800;});
 await page.locator('#catalogueZoom').click();
 assert.equal(await page.locator('dialog.catalogue-zoom[open] img').getAttribute('src'),await page.locator('#catalogueAnswer img').getAttribute('src'));
 await page.locator('dialog.catalogue-zoom [data-size]').click();assert.equal(await page.locator('dialog.catalogue-zoom--original').count(),1);
 await page.keyboard.press('Escape');await page.locator('dialog.catalogue-zoom').waitFor({state:'detached'});
 assert.ok(await page.locator('#catalogueZoom').evaluate(el=>el===document.activeElement));
 mkdirSync('ui-artifacts',{recursive:true});await page.screenshot({path:'ui-artifacts/catalogue-desktop.png',fullPage:true});
 const firstSrc=await page.locator('#catalogueAnswer img').getAttribute('src');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#catalogueResume:not([hidden])').waitFor();await page.locator('#catalogueResume').click();
 assert.equal(await page.locator('#catalogueAnswer img').getAttribute('src'),firstSrc);
 await page.setViewportSize({width:390,height:844});
 await page.locator('#catalogueZoom').click();
 assert.ok(await page.locator('dialog.catalogue-zoom').evaluate(el=>el.getBoundingClientRect().width<=window.innerWidth));
 await page.locator('dialog.catalogue-zoom [data-size]').click();
 await page.waitForFunction(()=>{const el=document.querySelector('.catalogue-zoom-scroll');return el&&el.scrollWidth>el.clientWidth;});
 await page.locator('dialog.catalogue-zoom [data-close]').click();
 await page.screenshot({path:'ui-artifacts/catalogue-mobile.png',fullPage:true});
 for(let i=0;i<5;i++){
  const fields=page.locator('#catalogueAnswer fieldset');for(let j=0;j<await fields.count();j++)await fields.nth(j).locator('input').first().check();
  const price=page.locator('#catalogueAnswer input[name=price]');if(await price.count())await price.fill('100');
  await page.locator('#catalogueAnswer button[type=submit]').click();await page.locator('.catalogue-feedback').waitFor();
  if(i<4)await page.locator('#catalogueNext').click();
 }
 assert.equal(db.prepare('SELECT count(*) n FROM catalogue_attempts WHERE completed_at IS NOT NULL').get().n,1);
 assert.ok((await page.locator('#catalogueQuestion').innerText()).includes('Batch completato'));
 assert.deepEqual(errors,[]);console.log('PASS: real browser admin toggle, start, images, reload/resume, mobile rendering and full five-knife submission.');
}finally{await browser.close();await new Promise(r=>server.close(r));db.close();}
