const { test, expect } = require('@playwright/test');
const fs = require('fs');
const script = fs.readFileSync('fuo-reui.user.js', 'utf8');
async function fixture(page, votes = ['AC','CA','AC','AB','AB'], opts = {}) {
  await page.route('https://fuoverflow.com/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
  await page.goto('https://fuoverflow.com/threads/test/');
  await page.evaluate(({votes,opts}) => {
    window.saved = {}; window.calls = 0; window.ocrCalls = 0;
    window.GM_addStyle = css => {const s=document.createElement('style');s.textContent=css;document.head.append(s)};
    window.GM_getResourceText = () => '';
    window.GM_getValue = (key, value) => key === 'deepseekKey' ? (opts.key || '') : value;
    window.GM_setValue = (key,value) => window.saved[key]=value;
    window.GM_registerMenuCommand = () => {};
    window.fetch = async () => ({ok:true,blob:async()=>new Blob(['test'],{type:'image/png'})});
    window.GM_xmlhttpRequest = args => {window.calls++;setTimeout(()=>args.onload({status:opts.aiError?500:200,responseText:JSON.stringify({choices:[{message:{content:opts.ai || 'AC'}}]})}),opts.aiDelay || 0)};
    window.Tesseract = {createWorker:async()=>({recognize:async()=>{window.ocrCalls++;await new Promise(r=>setTimeout(r,opts.ocrDelay||0));if(opts.ocrError)throw Error('OCR');return {data:{text:opts.text || 'Select one answer'}}},terminate:async()=>{}})};
    window.setQuestion = (name, answers) => {
      document.querySelector('.fancybox__container')?.remove();
      const root=document.createElement('div');root.className='fancybox__container fancybox-show-sidebar';
      root.innerHTML='<div class="fancybox__slide is-selected"><div class="fancybox__caption"><h4></h4></div><img class="fancybox-image"></div><aside class="fancybox-sidebar"><div class="fancybox-sidebar-content"><div class="xfmgInfoBlock-title"><h2></h2></div></div></aside>';
      root.querySelector('h4').textContent=name;root.querySelector('h2').textContent=name;
      root.querySelector('img').src='/'+name;
      for(const [i,answer] of answers.entries()){
        const c=document.createElement('div');c.className='js-comment';c.dataset.author=String(i);
        c.innerHTML='<div class="comment-body"><div class="bbWrapper"></div></div>';c.querySelector('.bbWrapper').textContent=answer;root.querySelector('.fancybox-sidebar-content').append(c);
      }
      document.body.append(root);
    };
    window.setQuestion('Q1.png',votes);
  }, {votes,opts});
  await page.addScriptTag({content:script});
  return page.locator('.fuo-quiz');
}
const option=(panel,letter)=>panel.locator('.fuo-options button').filter({hasText:new RegExp('^'+letter+'(?: |$)')});
test('multiple waits for Submit, uses plurality and displays percentages, saves full set',async({page})=>{
 const p=await fixture(page);await expect(p.locator('strong')).toContainText('Chọn nhiều');
 await expect(p.getByRole('button',{name:'Submit',exact:true})).toBeDisabled();
 await option(p,'A').click();await option(p,'C').click();await expect(p).not.toContainText('Nguồn');
 await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Đúng · Nguồn');await expect(p).toContainText('A,C: 60%');await expect(p).toContainText('A,B: 40%');
 expect(await page.evaluate(()=>Object.values(saved)[0].questions['Q1.png'].selected)).toBe('AC');
 await p.getByRole('button',{name:'Làm lại',exact:true}).click();await expect(option(p,'A')).toHaveAttribute('aria-pressed','false');await expect(p.locator('strong')).toContainText('Chọn nhiều');
});
for(const selected of [['A'],['A','B','C']])test('exact set required '+selected.join(''),async({page})=>{
 const p=await fixture(page,['AC']);await expect(p.locator('strong')).toContainText('Chọn nhiều');for(const l of selected)await option(p,l).click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Sai · Nguồn');expect(await page.evaluate(()=>Object.values(saved)[0].questions['Q1.png'].wrongSelected)).toBe(selected.join(''));
});
test('single immediate grading and author deduplication',async({page})=>{
 const p=await fixture(page,['A','B','A']);await expect(p.locator('strong')).toContainText('Chọn một');await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn');await expect(p.getByRole('button',{name:'Submit',exact:true})).toBeHidden();
});
for(const text of ['Choose two answers','Chọn tất cả đáp án đúng','Select multiple answers','Select all that apply'])test('OCR multiple '+text,async({page})=>{
 const p=await fixture(page,['không biết'],{text,key:'test'});await expect(p.locator('strong')).toContainText('Chọn nhiều');await option(p,'A').click();await option(p,'C').click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Đúng · Nguồn DeepSeek');expect(await page.evaluate(()=>calls)).toBe(1);
});
test('OCR default single, AI failure keeps selection and retry succeeds',async({page})=>{
 const p=await fixture(page,[],{text:'Question text',aiError:true,key:'test'});await expect(p.locator('strong')).toContainText('Chọn một');await option(p,'A').click();await expect(p).toContainText('HTTP 500');await expect(option(p,'A')).toHaveAttribute('aria-pressed','true');await expect(option(p,'A')).toBeEnabled();
});
test('OCR error exposes retry',async({page})=>{
 const p=await fixture(page,[],{ocrError:true});await expect(p.getByRole('button',{name:'Thử lại phân loại'})).toBeVisible();await expect(option(p,'A')).toBeDisabled();
});
test('tie calls AI, reference does not grade',async({page})=>{
 const p=await fixture(page,['A','B'],{key:'test',ai:'A'});await expect(p.locator('strong')).toContainText('Chọn một');await p.getByRole('button',{name:'Xem đáp án AI'}).click();await expect(p.locator('.fuo-ai-result')).toContainText('tham khảo');expect(await page.evaluate(()=>Object.keys(saved).length)).toBe(0);await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn DeepSeek');
});
test('switch during OCR never paints previous result',async({page})=>{
 const p=await fixture(page,[],{text:'Choose two',ocrDelay:250});await page.evaluate(()=>setQuestion('Q2.png',['B']));await expect(page.locator('.fuo-quiz strong')).toHaveText('Q2 · Chọn một đáp án');await page.waitForTimeout(400);await expect(page.locator('.fuo-quiz strong')).toHaveText('Q2 · Chọn một đáp án');
});
test('deduplicates same author and ignores prose',async({page})=>{
 const p=await fixture(page,['B','A','A','không biết']);
 await page.evaluate(()=>{setQuestion('Q2.png',['B','A','A','không biết']);document.querySelectorAll('.js-comment')[2].dataset.author='1'});
 const q=page.locator('.fuo-quiz');await expect(q.locator('strong')).toContainText('Chọn một');await option(q,'A').click();await expect(q).toContainText('chưa có đa số');expect(await page.evaluate(()=>calls)).toBe(0);
});
test('OCR retry reuses worker after successful classification, reset preserves star',async({page})=>{
 const p=await fixture(page,[],{ocrError:true,key:'test'});await expect(p.getByRole('button',{name:'Thử lại phân loại'})).toBeVisible();
 await page.evaluate(()=>{Tesseract.createWorker=async()=>({recognize:async()=>({data:{text:'Select two'}}),terminate:async()=>{}})});
 await p.getByRole('button',{name:'Thử lại phân loại'}).click();await expect(p.locator('strong')).toContainText('Chọn nhiều');await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();await option(p,'A').click();await option(p,'C').click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Đúng · Nguồn');await p.getByRole('button',{name:'Làm lại',exact:true}).click();await expect(p.getByRole('button',{name:'★ Đã đánh dấu',exact:true})).toBeVisible();
});
test('AI error retry succeeds with retained multiple selection',async({page})=>{
 const p=await fixture(page,['AC','AB'],{key:'test',aiError:true});await expect(p.locator('strong')).toContainText('Chọn nhiều');await option(p,'A').click();await option(p,'C').click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('HTTP 500');
 await page.evaluate(()=>{GM_xmlhttpRequest=args=>args.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:'AC'}}]})})});
 await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Đúng · Nguồn');
});
test('loading comments lock answers and do not start OCR',async({page})=>{
 const p=await fixture(page,['AC']);await page.evaluate(()=>{setQuestion('Q2.png',['B']);document.querySelector('.fancybox-sidebar-content').setAttribute('aria-busy','true')});
 const q=page.locator('.fuo-quiz');await expect(option(q,'B')).toBeDisabled();expect(await page.evaluate(()=>ocrCalls)).toBe(0);
 await page.evaluate(()=>document.querySelector('.fancybox-sidebar-content').removeAttribute('aria-busy'));await expect(q.locator('strong')).toContainText('Chọn một');await option(q,'B').click();await expect(q).toContainText('Đúng · Nguồn');
});
test('manual CSV contains full wrong selection and correct answer',async({page})=>{
 const p=await fixture(page,['AC']);await expect(p.locator('strong')).toContainText('Chọn nhiều');await option(p,'A').click();await option(p,'B').click();await p.getByRole('button',{name:'Submit',exact:true}).click();
 const download=page.waitForEvent('download');await p.getByRole('button',{name:'Xuất CSV',exact:true}).click();const file=await download;const csv=fs.readFileSync(await file.path(),'utf8');expect(csv).toContain('"AB","AC"');
});
test('AI finishing on previous question does not change current panel',async({page})=>{
 const p=await fixture(page,[],{key:'test',ai:'A',aiDelay:250});await expect(p.locator('strong')).toContainText('Chọn một');await option(p,'A').click();await page.evaluate(()=>setQuestion('Q2.png',['B']));await expect(page.locator('.fuo-quiz strong')).toHaveText('Q2 · Chọn một đáp án');await page.waitForTimeout(350);await expect(page.locator('.fuo-quiz')).not.toContainText('Nguồn');expect(await page.evaluate(()=>Object.values(saved)[0].questions['Q1.png'].selected)).toBe('A');
});
test('toggling selection and revisiting image uses cached OCR',async({page})=>{
 const p=await fixture(page,[],{text:'Select all'});await expect(p.locator('strong')).toContainText('Chọn nhiều');await option(p,'A').click();await option(p,'A').click();await expect(p.getByRole('button',{name:'Submit',exact:true})).toBeDisabled();
 await page.evaluate(()=>{setQuestion('Q2.png',[]);document.querySelector('img').src='/Q1.png'});await expect(page.locator('.fuo-quiz strong')).toHaveText('Q2 · Chọn nhiều đáp án');expect(await page.evaluate(()=>ocrCalls)).toBe(1);
});
test('final question exports only after successful grading',async({page})=>{
 const p=await fixture(page,['AC']);await page.evaluate(()=>{const a=document.createElement('a');a.href='/Q1.png';a.textContent='Q1.png';document.body.append(a);dispatchEvent(new Event('resize'))});await expect(p.locator('strong')).toContainText('Chọn nhiều');await option(p,'A').click();await page.waitForTimeout(80);expect(await page.evaluate(()=>Object.keys(saved).length)).toBe(0);const download=page.waitForEvent('download');await p.getByRole('button',{name:'Submit',exact:true}).click();await download;await expect(p).toContainText('Đã xuất CSV');expect(await page.evaluate(()=>Object.values(saved)[0].autoExported)).toBe(true);
});
