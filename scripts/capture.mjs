// Deterministic frame capture: render time advances explicitly, independent of GPU speed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
const base=process.env.CAPTURE_URL||'http://localhost:4173/';
const out=process.env.CAPTURE_OUT||'public/media/heathrow-flythrough.mp4';
const fps=24,duration=30,width=1600,height=900;
await fs.mkdir('public/media',{recursive:true});await fs.mkdir('work/screenshots',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'?demo&capture',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__HEATHROW__?.ready,null,{timeout:120000});
await page.addStyleTag({content:'#exit-film{display:none}'});
const ffmpeg=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
for(let frame=0;frame<duration*fps;frame++){
 const t=frame/fps*1.4;
 await page.evaluate(t=>window.__HEATHROW__.captureFrame(t),t);
 const bytes=await page.screenshot({type:'jpeg',quality:93});
 if(!ffmpeg.stdin.write(bytes))await once(ffmpeg.stdin,'drain');
 if(frame%(fps*5)===0){await fs.writeFile(`work/screenshots/film-${String(frame/fps).padStart(2,'0')}.jpg`,bytes);console.log(`Captured ${frame/fps}/${duration}s`);}
}
ffmpeg.stdin.end();const [code]=await once(ffmpeg,'close');await browser.close();if(code!==0||errors.length)throw new Error(JSON.stringify({code,errors}));console.log(`Saved ${out}`);
