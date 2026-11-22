const { test, expect } = require('@playwright/test');
const fs = require('fs');
const script = fs.readFileSync('fuo-reui.user.js', 'utf8');
async function fixture(page, votes = ['AC','CA','AC','AB','AB'], opts = {}) {
  await page.route('https://fuoverflow.com/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
  await page.goto('https://fuoverflow.com/threads/test/');
  await page.evaluate(({votes,opts}) => {
    window.gmStore = opts.store || {}; window.saved = {}; window.calls = 0; window.ocrCalls = 0;
    window.GM_addStyle = css => {const s=document.createElement('style');s.textContent=css;document.head.append(s)};
    window.GM_getResourceText = () => '';
    window.GM_getValue = (key, value) => Object.hasOwn(gmStore,key) ? gmStore[key] : key === 'deepseekKey' ? (opts.key || '') : value;
    window.GM_setValue = (key,value) => {gmStore[key]=value;window.saved[key]=value};
    window.GM_registerMenuCommand = () => {};
    window.fetch = async () => ({ok:true,blob:async()=>new Blob(['test'],{type:'image/png'})});
    window.GM_xmlhttpRequest = args => {window.calls++;window.lastAIRequest=JSON.parse(args.data);setTimeout(()=>args.onload({status:opts.aiError?500:200,responseText:JSON.stringify({choices:[{message:{content:opts.aiRaw ?? JSON.stringify({answer:opts.ai || 'AC',explanation:opts.explanation || 'Các phương án này thỏa mãn điều kiện của câu hỏi.'})}}]})}),opts.aiDelay || 0)};
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
test('key deletion invalidates cached AI and keeps secrets outside the dialog',async({page})=>{
 const p=await fixture(page,['A'],{key:'test-secret'});
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 await expect(p.locator('.fuo-ai-answer')).toBeVisible();
 await p.getByRole('button',{name:'Cài đặt AI',exact:true}).click();
 const dialog=page.getByRole('dialog');
 expect(await dialog.evaluate(el=>el.outerHTML)).not.toContain('test-secret');
 await dialog.getByRole('button',{name:'Xóa key',exact:true}).click();
 await dialog.getByRole('button',{name:'Đóng',exact:true}).click();
 await expect(p.locator('.fuo-ai-result')).toBeHidden();
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 await expect(p.locator('.fuo-ai-result')).toContainText('Hãy cài API key');
 expect(await page.evaluate(()=>calls)).toBe(1);
});
test('key deletion rejects an AI response already in flight',async({page})=>{
 const p=await fixture(page,['A'],{key:'test-secret',aiDelay:1000});
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 await expect.poll(()=>page.evaluate(()=>calls)).toBe(1);
 await p.getByRole('button',{name:'Cài đặt AI',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Xóa key',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
 await expect(p.locator('.fuo-ai-result')).toContainText('Cấu hình AI đã thay đổi');
 await expect(p.locator('.fuo-ai-answer')).toHaveCount(0);
});
for(const type of ['openai','deepseek','anthropic','gemini']) test('BYOK request and response for '+type,async({page})=>{
 const profile={baseUrl:'https://example.com/v1',compatibleType:type,model:'test-model',thinking:'high'};
 const p=await fixture(page,['A'],{store:{fuoAIConfig:{activeId:type,providers:{[type]:profile}},fuoAIKeys:{[type]:{origin:'https://example.com',key:'test-secret'}}}});
 await page.evaluate(type=>{
   window.GM_xmlhttpRequest=args=>{
     window.request={url:args.url,headers:args.headers,body:JSON.parse(args.data),anonymous:args.anonymous,timeout:args.timeout};
     const text=JSON.stringify({answer:'A',explanation:'Valid explanation.'});
     const result=type==='anthropic'?{content:[{type:'text',text}]}:type==='gemini'?{candidates:[{content:{parts:[{text}]}}]}:{choices:[{message:{content:text}}]};
     setTimeout(()=>args.onload({status:200,responseText:JSON.stringify(result)}),0);
   };
 },type);
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 await expect(p.locator('.fuo-ai-answer')).toHaveText('Đáp án: A');
 const req=await page.evaluate(()=>request);
 expect(req.anonymous).toBe(true);expect(req.timeout).toBe(120000);
 expect(req.url).not.toContain('test-secret');expect(req.body.model || 'test-model').toBe('test-model');
 if(type==='anthropic') {expect(req.headers['x-api-key']).toBe('test-secret');expect(req.body.thinking.budget_tokens).toBe(10240);}
 else if(type==='gemini') {expect(req.headers['x-goog-api-key']).toBe('test-secret');expect(req.body.generationConfig.thinkingConfig.thinkingBudget).toBe(8192);}
 else {expect(req.headers.Authorization).toBe('Bearer test-secret');expect(req.body.messages[0].content[2].image_url.url).toMatch(/^data:image\/png;base64,/);}
});
test('settings validate endpoints, remove keys on origin change and contain keyboard focus',async({page})=>{
 const p=await fixture(page,['A'],{key:'test-secret'});
 await p.getByRole('button',{name:'Cài đặt AI',exact:true}).click();
 const d=page.getByRole('dialog');
 await d.getByRole('button',{name:'Lưu cấu hình'}).focus();await page.keyboard.press('Tab');
 await expect(d.getByRole('button',{name:'Đóng hộp thoại'})).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(d.getByRole('button',{name:'Lưu cấu hình'})).toBeFocused();
 for(const url of ['http://example.com/v1','https://user:pass@example.com/v1','https://example.com/v1?key=abc']) {
   await d.getByLabel('Base URL',{exact:true}).fill(url);await d.getByRole('button',{name:'Lưu cấu hình'}).click();
   await expect(d.getByRole('alert')).toBeVisible();
   expect(await page.evaluate(()=>gmStore.fuoAIConfig)).toBeUndefined();
 }
 await d.getByLabel('Base URL',{exact:true}).fill('https://example.com/v1');
 await d.getByRole('button',{name:'Lưu cấu hình'}).click();
 await expect(d.getByRole('alert')).toContainText('API key cũ đã bị xóa');
 expect(await page.evaluate(()=>gmStore.deepseekKey)).toBe('');
 await page.keyboard.press('Escape');await expect(p.getByRole('button',{name:'Cài đặt AI',exact:true})).toBeFocused();
});
test('model discovery filters invalid IDs and stale lists on endpoint edit',async({page})=>{
 const p=await fixture(page,['A'],{key:'test-secret'});
 await page.evaluate(()=>{window.GM_xmlhttpRequest=args=>{
   window.modelRequest={url:args.url,anonymous:args.anonymous,headers:args.headers};
   setTimeout(()=>args.onload({status:200,responseText:JSON.stringify({data:[{id:'valid-model',name:'<script>bad</script>'},{id:'../bad'},{id:'valid-model'}]})}),0);
 }});
 await p.getByRole('button',{name:'Cài đặt AI',exact:true}).click();const d=page.getByRole('dialog');
 await d.getByRole('button',{name:'Tải danh sách (/models)',exact:true}).click();
 await expect(d.getByLabel('Danh sách model')).toBeVisible();
 expect(await d.getByLabel('Danh sách model').locator('option').count()).toBe(2);
 expect(await d.locator('script').count()).toBe(0);
 expect(await page.evaluate(()=>modelRequest)).toMatchObject({url:'https://api.deepseek.com/models',anonymous:true});
 await d.getByLabel('Base URL',{exact:true}).fill('https://example.com/v1');
 await expect(d.getByLabel('Danh sách model')).toBeHidden();
});
test('long AI explanations stay structured and reachable in a fixed sidebar',async({page},testInfo)=>{
 const explanation='Trong biểu đồ ER, hình chữ nhật kép biểu diễn thực thể yếu. '+ 'Phương án B sai vì thuộc tính đa trị dùng hình elip kép. '.repeat(35)+'\nKết luận: chọn A.';
 const p=await fixture(page,['A'],{key:'test',ai:'A',explanation});
 await page.addStyleTag({content:'.fancybox-sidebar{position:fixed;right:0;top:0;width:320px;height:100dvh}.fancybox-sidebar-content{min-height:80px}'});
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 const result=p.locator('.fuo-ai-result');
 await expect(result.locator('.fuo-ai-answer')).toHaveText('Đáp án: A');
 await expect(result.locator('p').last()).toHaveText('Kết luận: chọn A.');
 expect(await result.locator('p').count()).toBeGreaterThan(2);
 await result.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
 await page.screenshot({path:testInfo.outputPath('ai-redesign-top.png')});
 const sidebar=page.locator('.fancybox-sidebar');
 await sidebar.evaluate(el=>{el.scrollTop=el.scrollHeight});
 await expect(result.locator('p').last()).toBeInViewport();
 expect(await sidebar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(result).toHaveCSS('animation-name','none');
 await page.screenshot({path:testInfo.outputPath('ai-redesign.png')});
});
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
 const q=page.locator('.fuo-quiz');await expect(q.locator('strong')).toContainText('Chọn một');await option(q,'A').click();await expect(q).toContainText('API key');expect(await page.evaluate(()=>calls)).toBe(0);
});
test('OCR retry reuses worker after successful classification, reset preserves star',async({page})=>{
 const p=await fixture(page,[],{ocrError:true,key:'test'});await expect(p.getByRole('button',{name:'Thử lại phân loại'})).toBeVisible();
 await page.evaluate(()=>{Tesseract.createWorker=async()=>({recognize:async()=>({data:{text:'Select two'}}),terminate:async()=>{}})});
 await p.getByRole('button',{name:'Thử lại phân loại'}).click();await expect(p.locator('strong')).toContainText('Chọn nhiều');await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();await option(p,'A').click();await option(p,'C').click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Đúng · Nguồn');await p.getByRole('button',{name:'Làm lại',exact:true}).click();await expect(p.getByRole('button',{name:'★ Đã đánh dấu',exact:true})).toBeVisible();
});
test('AI error retry succeeds with retained multiple selection',async({page})=>{
 const p=await fixture(page,['AC','AB'],{key:'test',aiError:true});await expect(p.locator('strong')).toContainText('Chọn nhiều');await option(p,'A').click();await option(p,'C').click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('HTTP 500');
 await page.evaluate(()=>{GM_xmlhttpRequest=args=>args.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'AC',explanation:'Các lựa chọn này phù hợp.'})}}]})})});
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

// Regression: grading and the reference panel must consume the same AI result.
test('AI grading and reference reuse current selection; reset refreshes explanation',async({page})=>{
 const p=await fixture(page,[],{key:'test',ai:'A',explanation:'Báo cáo thuộc chức năng báo cáo, không phải xử lý giao dịch.'});
 await expect(p.locator('strong')).toContainText('Chọn một');await option(p,'B').click();await expect(option(p,'A')).toHaveAttribute('data-mark','right');
 await expect(p.locator('.fuo-ai-result')).toContainText('Đáp án: A');await expect(p.locator('.fuo-ai-result')).toContainText('Báo cáo thuộc');
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();expect(await page.evaluate(()=>calls)).toBe(1);
 await p.getByRole('button',{name:'Làm lại',exact:true}).click();await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn DeepSeek');expect(await page.evaluate(()=>calls)).toBe(2);
 expect(await page.evaluate(()=>Object.values(saved)[0].questions['Q1.png'].answer)).toBe('A');
});
test('AI reference before multiple Submit shares normalized answer and does not complete early',async({page})=>{
 const p=await fixture(page,['AC','AB'],{key:'test',ai:'C,A'});await expect(p.locator('strong')).toContainText('Chọn nhiều');
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();await expect(p.locator('.fuo-ai-result')).toContainText('Đáp án: A,C');expect(await page.evaluate(()=>Object.keys(saved).length)).toBe(0);
 await option(p,'A').click();await option(p,'C').click();await p.getByRole('button',{name:'Submit',exact:true}).click();await expect(p).toContainText('Đúng · Nguồn DeepSeek');expect(await page.evaluate(()=>calls)).toBe(2);
});
for(const conclusion of ['giao dịch không bao gồm những công việc của nhà sản xuất\n-> A','giải thích\nĐáp án: A','giải thích → A'])test('explicit comment conclusion wins without AI: '+conclusion,async({page})=>{
 const p=await fixture(page,[conclusion]);await expect(p.locator('strong')).toContainText('Chọn một');await option(p,'B').click();await expect(option(p,'A')).toHaveAttribute('data-mark','right');await expect(p).toContainText('Sai · Nguồn 1 bình luận');expect(await page.evaluate(()=>calls+ocrCalls)).toBe(0);
});
test('HTML line breaks preserve multiple-answer conclusion and exclude quoted votes',async({page})=>{
 const p=await fixture(page,['A']);await page.evaluate(()=>{setQuestion('Q2.png',['placeholder']);document.querySelector('.comment-body .bbWrapper').innerHTML='<blockquote class="bbCodeBlock--quote">Đáp án: B</blockquote><p>Lý do chọn:</p><br>-> C,A'});
 const q=page.locator('.fuo-quiz');await expect(q.locator('strong')).toContainText('Chọn nhiều');await option(q,'A').click();await option(q,'C').click();await q.getByRole('button',{name:'Submit',exact:true}).click();await expect(q).toContainText('Đúng · Nguồn 1 bình luận');expect(await page.evaluate(()=>calls+ocrCalls)).toBe(0);
});
test('prose with option letters does not become a comment vote',async({page})=>{
 const p=await fixture(page,['Có lẽ A hoặc B nhưng mình chưa chắc.'],{key:'test',ai:'A'});await expect(p.locator('strong')).toContainText('Chọn một');expect(await page.evaluate(()=>ocrCalls)).toBe(1);await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn DeepSeek');
});
for(const first of [true,false])test('AI/comment disagreement is explicit; comments retain grading priority, AI first '+first,async({page})=>{
 const p=await fixture(page,['A'],{key:'test',ai:'C'});await expect(p.locator('strong')).toContainText('Chọn một');
 if(first){await p.getByRole('button',{name:'Xem đáp án AI'}).click();await expect(p.locator('.fuo-ai-result')).toContainText('Đáp án: C')}
 await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn 1 bình luận');
 if(!first)await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 await expect(p.locator('.fuo-ai-result')).toContainText('AI chọn C, khác đáp án bình luận A');await expect(option(p,'A')).toHaveAttribute('data-mark','right');expect(await page.evaluate(()=>Object.values(saved)[0].questions['Q1.png'].answer)).toBe('A');
});
for(const content of ['C','{}',JSON.stringify({answer:'UNKNOWN',explanation:'Không chắc.'}),JSON.stringify({answer:'A'}),JSON.stringify({answer:'C',explanation:'Đáp án: A\nLý do.'})])test('reject invalid or explicitly contradictory AI result '+content,async({page})=>{
 const p=await fixture(page,[],{key:'test',aiRaw:content});await expect(p.locator('strong')).toContainText('Chọn một');await option(p,'B').click();await expect(p).toContainText('chưa trả về đáp án và lời giải hợp lệ');await expect(option(p,'B')).toHaveAttribute('aria-pressed','true');await expect(option(p,'A')).toHaveAttribute('data-mark','');expect(await page.evaluate(()=>Object.keys(saved).length)).toBe(0);
 await page.evaluate(()=>{GM_xmlhttpRequest=args=>args.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'A',explanation:'Lý do phù hợp.'})}}]})})});await option(p,'B').click();await expect(p).toContainText('Sai · Nguồn DeepSeek');await expect(option(p,'A')).toHaveAttribute('data-mark','right');
});

test('AI prompt includes current wrong selection and refreshes after reference or retry',async({page})=>{
 const p=await fixture(page,[],{key:'test',ai:'A'});
 await expect(p.locator('strong')).toContainText('Chọn một');
 await p.getByRole('button',{name:'Xem đáp án AI'}).click();
 await expect(p.locator('.fuo-ai-result')).toContainText('Đáp án: A');
 expect(JSON.stringify(await page.evaluate(()=>lastAIRequest.messages))).toContain('Người dùng chưa chọn đáp án.');
 await option(p,'B').click();await expect(p).toContainText('Sai · Nguồn DeepSeek');
 let messages=JSON.stringify(await page.evaluate(()=>lastAIRequest.messages));
 expect(messages).toContain('Lựa chọn hiện tại của người dùng: B.');
 expect(messages).toContain('vì sao từng phương án họ chọn sai');
 expect(messages).toContain('phương án đúng còn thiếu');
 await p.getByRole('button',{name:'Làm lại',exact:true}).click();await option(p,'C').click();await expect(p).toContainText('Sai · Nguồn DeepSeek');
 expect(JSON.stringify(await page.evaluate(()=>lastAIRequest.messages))).toContain('Lựa chọn hiện tại của người dùng: C.');
 expect(await page.evaluate(()=>calls)).toBe(3);
});


for (const name of ['Q27_91_20250804144948.webp', 'q2-scan_123.JPEG']) test('suffixed filename grades, persists and completes catalog: '+name, async({page})=>{
 await fixture(page,['A']);
 await page.evaluate(name=>{
   const wrapper=document.createElement('div');wrapper.className='bbWrapper';
   for(const filename of ['Q1.png',name]){
     const a=document.createElement('a');a.href='/'+filename;
     const img=document.createElement('img');img.alt=filename;a.append(img);wrapper.append(a);
   }
   document.body.append(wrapper);setQuestion(name,['A']);
 },name);
 const p=page.locator('.fuo-quiz');await expect(p).toBeVisible();await expect(p.locator('strong')).toContainText('Chọn một');
 await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();
 const download=page.waitForEvent('download');await option(p,'A').click();await download;
 await expect(p).toContainText('Đúng · Nguồn 1 bình luận');await expect(p).toContainText('Đã xuất CSV');
 expect(await page.evaluate(name=>Object.values(saved)[0].questions[name].selected,name)).toBe('A');
 await page.evaluate(()=>setQuestion('Q1.png',['B']));await expect(page.locator('.fuo-quiz strong')).toHaveText('Q1 · Chọn một đáp án');
 await page.evaluate(name=>setQuestion(name,['A']),name);await expect(page.locator('.fuo-quiz')).toContainText('Đúng · Nguồn');
});
for(const name of ['holiday','Q27_notes.txt','Q27.webp.exe']) test('non-question filename stays hidden: '+name,async({page})=>{
 await fixture(page,['A']);await page.evaluate(name=>setQuestion(name,['A']),name);await expect(page.locator('.fuo-quiz')).toBeHidden();
});

for (const name of ['CEA201_SP26_FE (7).webp','Screenshot 2026-11-20.png']) test('gallery metadata handles arbitrary filenames and signed URLs: '+name,async({page})=>{
 await fixture(page,['A']);
 await page.evaluate(name=>{
   const a=document.createElement('a');a.href='/attachments/opaque.123/?signature=new';a.dataset.fancybox='exam';a.dataset.caption='<h4>'+name+'</h4>';
   document.body.append(a);setQuestion(name,['A']);document.querySelector('img.fancybox-image').src='/attachments/opaque.123/?signature=old';
 },name);
 const p=page.locator('.fuo-quiz');await expect(p).toBeVisible();await expect(p.locator('strong')).toContainText('Chọn một');
 const download=page.waitForEvent('download');await option(p,'A').click();await download;
 await expect(p).toContainText('Đã xuất CSV');expect(await page.evaluate(name=>Object.values(saved)[0].questions[name].selected,name)).toBe('A');
});

test('compact gallery keeps recognizing caption outside the selected slide',async({page})=>{
 await fixture(page,['A']);await page.evaluate(()=>{
   setQuestion('CEA201_SP26_FE (7).webp',['A']);
   const root=document.querySelector('.fancybox__container');root.append(root.querySelector('.fancybox__caption'));
 });
 const p=page.locator('.fuo-quiz');await expect(p).toBeVisible();await expect(p.locator('strong')).toContainText('CEA201_SP26_FE (7)');
 await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn');
});

test('duplicate filenames keep separate answers, stars and completion across signed URLs',async({page})=>{
 await fixture(page,['A']);
 await page.evaluate(()=>{
   for(const id of [101,102]){
     const a=document.createElement('a');a.href='/attachments/exam-webp.'+id+'/?signature=new';
     a.dataset.fancybox='exam';a.dataset.caption='<h4>exam.webp</h4>';document.body.append(a);
   }
   window.openAttachment=(id,votes)=>{setQuestion('exam.webp',votes);document.querySelector('img.fancybox-image').src='/attachments/exam-webp.'+id+'/?signature=old'};
   openAttachment(101,['A']);
 });
 const p=page.locator('.fuo-quiz');await expect(option(p,'A')).toBeEnabled();
 await option(p,'B').click();await expect(p).toContainText('Sai · Nguồn');await expect(p).not.toContainText('Đã xuất CSV');
 await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();
 await page.evaluate(()=>openAttachment(102,['B']));
 await expect(option(p,'A')).toHaveAttribute('aria-pressed','false');
 await expect(p.getByRole('button',{name:'☆ Đánh dấu',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await option(p,'B').click();await download;
 await expect(p).toContainText('Đúng · Nguồn');await expect(p).toContainText('Đã xuất CSV');
 await page.evaluate(()=>openAttachment(101,['A']));
 await expect(option(p,'B')).toHaveAttribute('aria-pressed','true');await expect(p).toContainText('Sai · Nguồn');
 await expect(p.getByRole('button',{name:'★ Đã đánh dấu',exact:true})).toBeVisible();
 const questions=await page.evaluate(()=>Object.values(saved)[0].questions);
 expect(Object.keys(questions)).toHaveLength(2);
 expect(Object.values(questions).map(q=>q.answer)).toEqual(['A','B']);
});

test('duplicate filename waits for the matching media sidebar',async({page})=>{
 await fixture(page,['A']);await page.evaluate(()=>{
   const a=document.createElement('a');a.href='/attachments/exam.101/';a.dataset.caption='<h4>exam.webp</h4>';a.dataset.lbSidebarHref='/media/exam.501/?lightbox=1';document.body.append(a);
   setQuestion('exam.webp',['B']);document.querySelector('img.fancybox-image').src=a.href;
   const link=document.createElement('a');link.href='/media/exam.500/report';document.querySelector('.fancybox-sidebar-content').append(link);
 });
 const p=page.locator('.fuo-quiz');await expect(option(p,'A')).toBeDisabled();
 await page.evaluate(()=>{
   document.querySelector('.fancybox-sidebar-content a').href='/media/exam.501/report';
   document.querySelector('.js-comment .bbWrapper').textContent='A';
 });
 await expect(option(p,'A')).toBeEnabled();await option(p,'A').click();await expect(p).toContainText('Đúng · Nguồn');
});

test('keyboard shortcuts select options, submit, reset, star, toggle comments and ask AI',async({page})=>{
 const p=await fixture(page,['AC'],{key:'k'});
 await expect(p.locator('strong')).toContainText('Chọn nhiều');
 await page.keyboard.press('1');
 await page.keyboard.press('c');
 await expect(option(p,'A')).toHaveAttribute('aria-pressed','true');
 await expect(option(p,'C')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Enter');
 await expect(p).toContainText('Đúng · Nguồn');
 await page.keyboard.press('s');
 await expect(p.getByRole('button',{name:'★ Đã đánh dấu',exact:true})).toBeVisible();
 await page.keyboard.press('c');
 await expect(p.getByRole('button',{name:'Ẩn bình luận',exact:true})).toBeVisible();
 await page.keyboard.press('e');
 await expect(p.locator('.fuo-ai-result')).toContainText('Đáp án: A,C');
 await page.keyboard.press('r');
 await expect(option(p,'A')).toHaveAttribute('aria-pressed','false');
});

test('keyboard shortcuts stay inactive when settings dialog is open',async({page})=>{
 const p=await fixture(page,['A'],{key:'k'});
 await expect(option(p,'A')).toBeEnabled();
 await p.getByRole('button',{name:'Cài đặt AI',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.keyboard.press('a');
 await page.keyboard.press('s');
 await page.keyboard.press('Escape');
 await expect(option(p,'A')).toHaveAttribute('aria-pressed','false');
 await expect(p.getByRole('button',{name:'☆ Đánh dấu',exact:true})).toBeVisible();
});

test('progress bar tracks accuracy and quick-jump switches to wrong or starred questions',async({page})=>{
 const p=await fixture(page,['A']);
 await page.evaluate(()=>{
   const answers={ 'Q1.png':['A'], 'Q2.png':['B'], 'Q3.png':['C'] };
   for(const name of ['Q1.png','Q2.png','Q3.png']){
     const a=document.createElement('a');
     a.href='/'+name; a.textContent=name; a.dataset.fancybox='exam';
     a.addEventListener('click',e=>{ e.preventDefault(); setQuestion(name,answers[name]); });
     document.body.append(a);
   }
   dispatchEvent(new Event('resize'));
 });
 await expect(p.locator('.fuo-progress')).toContainText('Tiến độ: 0/3');
 await option(p,'B').click();
 await expect(p.locator('.fuo-progress')).toContainText('Tiến độ: 1/3 · Đúng 0%');
 await expect(p.getByRole('button',{name:'Câu sai (1)',exact:true})).toBeVisible();
 await page.evaluate(()=>document.querySelector('a[href="/Q2.png"]').click());
 await expect(p.locator('strong')).toContainText('Q2');
 await option(p,'B').click();
 await expect(p.locator('.fuo-progress')).toContainText('Tiến độ: 2/3 · Đúng 50%');
 await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();
 await expect(p.getByRole('button',{name:'Câu gắn sao (1)',exact:true})).toBeVisible();
 await p.getByRole('button',{name:'Câu sai (1)',exact:true}).click();
 await expect(p.locator('strong')).toContainText('Q1');
 await p.getByRole('button',{name:'Câu gắn sao (1)',exact:true}).click();
 await expect(p.locator('strong')).toContainText('Q2');
});

test('persisted OCR cache skips Tesseract across visits and saves after grading',async({page})=>{
 const p=await fixture(page,[],{store:{fuoOcrTypeCache:{'https://fuoverflow.com/Q1.png':'multiple'}}});
 await expect(p.locator('strong')).toContainText('Chọn nhiều');
 expect(await page.evaluate(()=>ocrCalls)).toBe(0);
 await page.evaluate(()=>setQuestion('Q2.png',[]));
 await expect(p.locator('strong')).toContainText('Q2 · Chọn một');
 expect(await page.evaluate(()=>ocrCalls)).toBe(1);
 await page.evaluate(()=>dispatchEvent(new Event('pagehide')));
 expect(await page.evaluate(()=>gmStore.fuoOcrTypeCache['https://fuoverflow.com/Q2.png'])).toBe('single');
});

test('exam mode hides per-question grading, grades all on submit and jumps to wrong items',async({page})=>{
 const p=await fixture(page,['A']);
 await page.evaluate(()=>{
   window.prompt=()=>'30';
   const answers={ 'Q1.png':['A'], 'Q2.png':['B'] };
   for(const name of ['Q1.png','Q2.png']){
     const a=document.createElement('a');
     a.href='/'+name; a.textContent=name; a.dataset.fancybox='exam';
     a.addEventListener('click',e=>{ e.preventDefault(); setQuestion(name,answers[name]); });
     document.body.append(a);
   }
   dispatchEvent(new Event('resize'));
 });
 await p.getByRole('button',{name:'Thi thử',exact:true}).click();
 await expect(p.locator('.fuo-exam-bar')).toContainText('Thi thử · Đã chọn 0/2');
 await expect(p.getByRole('button',{name:'Xem đáp án AI'})).toBeDisabled();
 await expect(p.getByRole('button',{name:'Hiện bình luận'})).toBeDisabled();
 await option(p,'B').click();
 await expect(option(p,'B')).toHaveAttribute('aria-pressed','true');
 await expect(option(p,'B')).toHaveAttribute('data-mark','');
 await page.evaluate(()=>document.querySelector('a[href="/Q2.png"]').click());
 await expect(p.locator('strong')).toContainText('Q2');
 await option(p,'B').click();
 await expect(p.locator('.fuo-exam-bar')).toContainText('Đã chọn 2/2');
 await p.getByRole('button',{name:'Nộp bài',exact:true}).click();
 await expect(p.locator('.fuo-exam-summary')).toContainText('Kết quả thi thử: 1/2 đúng (50%)');
 await p.locator('.fuo-exam-wrong-list').getByRole('button',{name:'Q1',exact:true}).click();
 await expect(p.locator('strong')).toContainText('Q1');
 await expect(option(p,'B')).toHaveAttribute('data-mark','wrong');
 await expect(option(p,'A')).toHaveAttribute('data-mark','right');
});

test('review round loops wrong and starred questions until all are answered right',async({page})=>{
 const p=await fixture(page,['A']);
 await page.evaluate(()=>{
   const answers={ 'Q1.png':['A'], 'Q2.png':['B'] };
   for(const name of ['Q1.png','Q2.png']){
     const a=document.createElement('a');
     a.href='/'+name; a.textContent=name; a.dataset.fancybox='exam';
     a.addEventListener('click',e=>{ e.preventDefault(); setQuestion(name,answers[name]); });
     document.body.append(a);
   }
   dispatchEvent(new Event('resize'));
 });
 await option(p,'B').click();
 await page.evaluate(()=>document.querySelector('a[href="/Q2.png"]').click());
 await expect(p.locator('strong')).toContainText('Q2');
 await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();
 await p.getByRole('button',{name:'Ôn tập (2)',exact:true}).click();
 await expect(p.locator('.fuo-review-bar')).toContainText('Vòng ôn tập: còn 2/2 câu');
 await expect(p.locator('strong')).toContainText('Q1');
 await option(p,'A').click();
 await expect(p.locator('.fuo-review-bar')).toContainText('Vòng ôn tập: còn 1/2 câu');
 await p.getByRole('button',{name:'Câu tiếp',exact:true}).click();
 await expect(p.locator('strong')).toContainText('Q2');
 await option(p,'B').click();
 await expect(p.locator('.fuo-review-bar')).toContainText('Đã ôn đúng hết 2/2 câu.');
});

test('backup modal exports Anki TSV and JSON without API keys and restores progress',async({page})=>{
 const p=await fixture(page,['A'],{key:'super-secret-key'});
 await option(p,'B').click();
 await p.getByRole('button',{name:'☆ Đánh dấu',exact:true}).click();
 await p.getByRole('button',{name:'Sao lưu',exact:true}).click();
 const d=page.getByRole('dialog');
 const ankiDl=page.waitForEvent('download');
 await d.getByRole('button',{name:'Xuất Anki (.tsv)',exact:true}).click();
 const ankiContent=fs.readFileSync(await (await ankiDl).path(),'utf8');
 expect(ankiContent).toContain('Q1.png');
 expect(ankiContent).toContain('Đáp án:</b> A');
 expect(ankiContent).toContain('sai danh-dau');
 const jsonDl=page.waitForEvent('download');
 await d.getByRole('button',{name:'Sao lưu JSON',exact:true}).click();
 const backupPath=await (await jsonDl).path();
 const backupText=fs.readFileSync(backupPath,'utf8');
 expect(backupText).not.toContain('super-secret-key');
 const parsed=JSON.parse(backupText);
 expect(parsed.app).toBe('fuo-reui');
 expect(parsed.review.questions['Q1.png'].wrong).toBe(true);
 // Modify backup JSON and restore it into the page
 parsed.review.questions['Q9.png']={selected:'C',answer:'D',wrong:true,starred:true};
 const modified=JSON.stringify(parsed);
 await d.locator('input[type="file"]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(modified,'utf8')});
 await expect(d.getByRole('alert')).toContainText('Đã khôi phục 2 câu');
 await d.getByRole('button',{name:'Đóng',exact:true}).click();
 await expect(p.getByRole('button',{name:'Câu sai (2)',exact:true})).toBeVisible();
});
