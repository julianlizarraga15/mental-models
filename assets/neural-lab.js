(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const boundary = $('boundaryCanvas'), network = $('networkCanvas'), lossCanvas = $('lossCanvas');
  const bctx = boundary.getContext('2d'), nctx = network.getContext('2d'), lctx = lossCanvas.getContext('2d');
  const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
  const rand = () => (Math.random() * 2 - 1) * 1.4;
  let weights, data, step = 0, playing = false, timer = 0, history = [], latest = null, inspect = 0;

  const datasets = {
    xor: [[-.75,-.75,0],[-.78,.75,1],[.75,-.72,1],[.74,.76,0],[-.55,-.88,0],[-.62,.58,1],[.58,-.58,1],[.58,.63,0]],
    linear: [[-.8,-.5,0],[-.7,.05,0],[-.25,-.65,0],[-.15,.35,1],[.2,-.15,1],[.35,.55,1],[.75,-.1,1],[.72,.72,1]],
    circle: [[-.12,.1,1],[.28,-.12,1],[-.25,-.22,1],[.18,.32,1],[-.82,-.65,0],[-.72,.7,0],[.72,-.7,0],[.78,.64,0]]
  };

  function initWeights() { weights = { w1: Array.from({length:4}, () => [rand(),rand()]), b1: Array.from({length:4}, rand), w2: Array.from({length:4}, rand), b2: rand() }; }
  function forward(x, y) { const h = weights.w1.map((w,j) => sigmoid(w[0]*x+w[1]*y+weights.b1[j])); return {h, o:sigmoid(h.reduce((s,v,j)=>s+v*weights.w2[j],weights.b2))}; }

  function trainOne() {
    const sample = data[step % data.length], [x,y,label] = sample, before = forward(x,y), error = before.o-label;
    const d2 = error * before.o * (1-before.o), old = JSON.parse(JSON.stringify(weights));
    const gradW2 = before.h.map(h => d2*h), gradB2 = d2;
    const gradH = weights.w2.map((w,j) => d2*w*before.h[j]*(1-before.h[j]));
    const gradsW1 = gradH.map(g => [g*x,g*y]), lr = +$('rateInput').value/100;
    weights.w2.forEach((_,j) => weights.w2[j] -= lr*gradW2[j]); weights.b2 -= lr*gradB2;
    weights.w1.forEach((_,j) => { weights.w1[j][0]-=lr*gradsW1[j][0]; weights.w1[j][1]-=lr*gradsW1[j][1]; weights.b1[j]-=lr*gradH[j]; });
    const allGrad = [...gradW2,gradB2,...gradsW1.flat(),...gradH], maxGrad = Math.max(...allGrad.map(Math.abs));
    const changes = weights.w2.map((w,j)=>({name:`h${j+1} → output`, amount:w-old.w2[j]}));
    latest = {sample, prediction:before.o, error, maxGrad, biggest:changes.sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount))[0]};
    step++; inspect = (step-1)%data.length; updateMetrics(); draw();
  }

  function evaluate() { let loss=0, right=0; data.forEach(([x,y,t])=>{const p=forward(x,y).o; loss+=-(t*Math.log(p+1e-8)+(1-t)*Math.log(1-p+1e-8)); right+=(p>=.5)==t;}); return {loss:loss/data.length, accuracy:right/data.length}; }
  function updateMetrics() {
    const m=evaluate(); if(step%data.length===0 || history.length===0) history.push(m.loss);
    $('stepMetric').textContent=step.toLocaleString(); $('lossMetric').textContent=m.loss.toFixed(4); $('accuracyMetric').textContent=Math.round(m.accuracy*100)+'%';
    if(latest){ $('updateMetric').textContent=`${latest.biggest.name}: ${latest.biggest.amount>=0?'+':''}${latest.biggest.amount.toFixed(4)}`; $('flowPrediction').textContent=latest.prediction.toFixed(3); $('flowError').textContent=(latest.error>=0?'+':'')+latest.error.toFixed(3); $('flowGradient').textContent=latest.maxGrad.toFixed(4); $('flowUpdate').textContent=(latest.biggest.amount>=0?'+':'')+latest.biggest.amount.toFixed(4); }
  }
  function reset(){ playing=false; clearTimeout(timer); $('playButton').textContent='▶ Train'; $('statusText').textContent='Ready'; $('statusDot').parentElement.classList.remove('running'); step=0; history=[]; latest=null; data=datasets[$('datasetSelect').value].map(v=>v.slice()); initWeights(); updateMetrics(); draw(); }
  function loop(){ if(!playing)return; const count=Math.max(1,Math.round(+$('speedInput').value/8)); for(let i=0;i<count;i++)trainOne(); timer=setTimeout(loop, Math.max(25,260-(+$('speedInput').value*4))); }

  function drawBoundary(){
    const w=boundary.width,h=boundary.height, cell=10; bctx.clearRect(0,0,w,h);
    for(let py=0;py<h;py+=cell)for(let px=0;px<w;px+=cell){ const p=forward(px/w*2-1,1-py/h*2).o, a=.12+Math.abs(p-.5)*.62; bctx.fillStyle=p>.5?`rgba(94,234,212,${a})`:`rgba(251,113,133,${a})`; bctx.fillRect(px,py,cell+1,cell+1); }
    bctx.strokeStyle='rgba(255,255,255,.1)'; bctx.lineWidth=1; for(let i=1;i<4;i++){bctx.beginPath();bctx.moveTo(i*w/4,0);bctx.lineTo(i*w/4,h);bctx.stroke();bctx.beginPath();bctx.moveTo(0,i*h/4);bctx.lineTo(w,i*h/4);bctx.stroke();}
    data.forEach(([x,y,t],i)=>{const px=(x+1)/2*w,py=(1-y)/2*h;bctx.beginPath();bctx.arc(px,py,i===inspect?12:9,0,Math.PI*2);bctx.fillStyle=t?'#5eead4':'#fb7185';bctx.fill();bctx.strokeStyle=i===inspect?'white':'#07111f';bctx.lineWidth=i===inspect?4:3;bctx.stroke();});
  }
  function drawNetwork(){
    const w=network.width,h=network.height, ins=[[90,155],[90,345]], hidden=[80,190,310,420].map(y=>[310,y]), out=[535,250], sample=data[inspect]||data[0], f=forward(sample[0],sample[1]); nctx.clearRect(0,0,w,h);
    const line=(a,b,val)=>{nctx.beginPath();nctx.moveTo(...a);nctx.lineTo(...b);nctx.strokeStyle=val>=0?'rgba(56,189,248,.85)':'rgba(251,113,133,.85)';nctx.lineWidth=1+Math.min(10,Math.abs(val)*4);nctx.stroke();};
    ins.forEach((p,i)=>hidden.forEach((q,j)=>line(p,q,weights.w1[j][i])));hidden.forEach((p,j)=>line(p,out,weights.w2[j]));
    const node=(p,r,fill,label,value)=>{nctx.beginPath();nctx.arc(...p,r,0,Math.PI*2);nctx.fillStyle=fill;nctx.fill();nctx.strokeStyle='rgba(255,255,255,.55)';nctx.lineWidth=2;nctx.stroke();nctx.textAlign='center';nctx.fillStyle='#f8fafc';nctx.font='700 15px system-ui';nctx.fillText(label,p[0],p[1]-3);nctx.font='12px system-ui';nctx.fillText(value,p[0],p[1]+15);};
    ins.forEach((p,i)=>node(p,34,'#152237',`x${i+1}`,sample[i].toFixed(2)));hidden.forEach((p,i)=>node(p,32,`rgba(94,234,212,${.12+f.h[i]*.7})`,`h${i+1}`,f.h[i].toFixed(2)));node(out,42,`rgba(56,189,248,${.18+f.o*.7})`,'ŷ',f.o.toFixed(3));
    nctx.fillStyle='#94a3b8';nctx.font='700 12px system-ui';nctx.fillText('INPUTS',90,60);nctx.fillText('HIDDEN LAYER',310,30);nctx.fillText('OUTPUT',535,165);
    $('sampleName').textContent=`x = (${sample[0].toFixed(2)}, ${sample[1].toFixed(2)}) · label ${sample[2]}`;$('predictionValue').textContent=f.o.toFixed(3);
  }
  function drawLoss(){const w=lossCanvas.width,h=lossCanvas.height;lctx.clearRect(0,0,w,h);lctx.strokeStyle='rgba(255,255,255,.1)';lctx.beginPath();lctx.moveTo(44,20);lctx.lineTo(44,h-24);lctx.lineTo(w-15,h-24);lctx.stroke(); if(history.length<2)return;const visible=history.slice(-160),max=Math.max(.7,...visible),min=Math.min(...visible)*.9;lctx.beginPath();visible.forEach((v,i)=>{const x=44+i/(visible.length-1)*(w-70),y=20+(max-v)/(max-min||1)*(h-50);i?lctx.lineTo(x,y):lctx.moveTo(x,y);});lctx.strokeStyle='#5eead4';lctx.lineWidth=4;lctx.stroke();lctx.fillStyle='#94a3b8';lctx.font='22px system-ui';lctx.fillText('loss over time',58,48);}
  function draw(){drawBoundary();drawNetwork();drawLoss();}
  $('playButton').onclick=()=>{playing=!playing;$('playButton').textContent=playing?'Ⅱ Pause':'▶ Train';$('statusText').textContent=playing?'Learning…':'Paused';$('statusDot').parentElement.classList.toggle('running',playing);if(playing)loop();};
  $('stepButton').onclick=()=>{if(playing)$('playButton').click();trainOne();$('statusText').textContent='Stepped once';}; $('resetButton').onclick=reset; $('datasetSelect').onchange=reset;
  $('speedInput').oninput=e=>$('speedOutput').textContent=e.target.value+'×'; $('rateInput').oninput=e=>$('rateOutput').textContent=(e.target.value/100).toFixed(2);
  boundary.onclick=e=>{const r=boundary.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*2-1,y=1-(e.clientY-r.top)/r.height*2;data.push([x,y,e.shiftKey?1:0]);updateMetrics();draw();};
  reset();
})();
