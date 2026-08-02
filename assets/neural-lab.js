(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = [
    [-0.9,-0.7,0],[-0.7,0.2,0],[-0.5,-0.3,0],[-0.3,0.8,0],[-0.1,-0.6,0],
    [0.2,-0.5,1],[0.35,0.4,1],[0.55,-0.1,1],[0.75,0.7,1],[0.9,0.1,1]
  ];
  const sigmoid = z => 1/(1+Math.exp(-z));
  const fmt = n => (n >= 0 ? '+' : '') + n.toFixed(3);
  let p=null, example=0, epoch=1, phase='reset', cache=null, losses=[], playing=false, timer=null;
  const phases=['data','forward','loss','gradient','update'];
  const phaseText={data:'Example selected',forward:'Forward pass',loss:'Loss calculated',gradient:'Gradients calculated',update:'Parameters updated'};

  function randomParameter(){ return Math.random()*1.2-.6; }
  function initialize(){
    p={w11:randomParameter(),w12:randomParameter(),w21:randomParameter(),w22:randomParameter(),b1:randomParameter(),b2:randomParameter(),v1:randomParameter(),v2:randomParameter(),bo:randomParameter()};
    example=0;epoch=1;losses=[];phase='data';cache=null;playing=false;clearTimeout(timer);
    $('initializeButton').textContent='Re-initialize randomly';$('nextButton').disabled=false;$('autoButton').disabled=false;$('autoButton').textContent='▶ Auto';
    render();
  }
  function forward(){
    const [x1,x2,y]=data[example],z1=x1*p.w11+x2*p.w12+p.b1,z2=x1*p.w21+x2*p.w22+p.b2,h1=sigmoid(z1),h2=sigmoid(z2),zo=h1*p.v1+h2*p.v2+p.bo,yhat=sigmoid(zo);
    cache={x1,x2,y,z1,z2,h1,h2,zo,yhat};
  }
  function calculateLoss(){ cache.loss=-(cache.y*Math.log(cache.yhat)+(1-cache.y)*Math.log(1-cache.yhat)); }
  function calculateGradients(){
    const c=cache,dzo=c.yhat-c.y;
    c.g={bo:dzo,v1:dzo*c.h1,v2:dzo*c.h2};
    const dz1=dzo*p.v1*c.h1*(1-c.h1),dz2=dzo*p.v2*c.h2*(1-c.h2);
    Object.assign(c.g,{b1:dz1,w11:dz1*c.x1,w12:dz1*c.x2,b2:dz2,w21:dz2*c.x1,w22:dz2*c.x2});
  }
  function update(){ Object.keys(cache.g).forEach(k=>p[k]-=.35*cache.g[k]);losses.push(cache.loss); }
  function advance(){
    if(phase==='data'){forward();phase='forward';}
    else if(phase==='forward'){calculateLoss();phase='loss';}
    else if(phase==='loss'){calculateGradients();phase='gradient';}
    else if(phase==='gradient'){update();phase='update';}
    else {example++;if(example===data.length){example=0;epoch++;losses=[];}$('parameterGrid').querySelectorAll('.parameter').forEach(e=>e.classList.remove('changed'));phase='data';cache=null;}
    render();
  }
  function renderTable(){
    $('dataBody').innerHTML=data.map((r,i)=>`<tr class="${p&&i===example?'active':''} ${p&&i<example?'done':''}"><td>${i+1}</td><td>${r[0].toFixed(2)}</td><td>${r[1].toFixed(2)}</td><td><i class="label-dot label-${r[2]}"></i>${r[2]?'Mint':'Coral'}</td></tr>`).join('');
  }
  function drawData(){
    const c=$('dataCanvas'),x=c.getContext('2d'),w=c.width,h=c.height,pad=28;x.clearRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,.13)';x.lineWidth=1;
    x.beginPath();x.moveTo(w/2,pad);x.lineTo(w/2,h-pad);x.moveTo(pad,h/2);x.lineTo(w-pad,h/2);x.stroke();
    data.forEach((r,i)=>{const px=pad+(r[0]+1)/2*(w-pad*2),py=pad+(1-r[1])/2*(h-pad*2);x.beginPath();x.arc(px,py,p&&i===example?10:7,0,Math.PI*2);x.fillStyle=r[2]?'#5eead4':'#fb7185';x.fill();x.strokeStyle=p&&i===example?'white':'#07111f';x.lineWidth=p&&i===example?3:2;x.stroke();x.fillStyle='#f8fafc';x.font='700 9px system-ui';x.textAlign='center';x.fillText(i+1,px,py+3);});
  }
  function story(){ phases.forEach(name=>{const el=$('story'+name[0].toUpperCase()+name.slice(1));el.className=phase===name?'active':phases.indexOf(name)<phases.indexOf(phase)?'done':'';}); }
  function renderCurrent(){
    if(!p){$('exampleTitle').textContent='No example yet';return;}
    const r=data[example];$('exampleTitle').textContent=`Example ${example+1} of 10`;$('currentX1').textContent=r[0].toFixed(2);$('currentX2').textContent=r[1].toFixed(2);$('currentLabel').innerHTML=`<i class="label-dot label-${r[2]}"></i>${r[2]?'Mint (1)':'Coral (0)'}`;$('phaseBadge').textContent=phaseText[phase];
    const messages={
      data:`This is <strong>batch ${example+1}</strong>. Because batch size is 1, the batch contains only this row. Next, its two features enter the network.`,
      forward:`The network combined the two features with its weights and biases. Its prediction is <strong>${cache.yhat.toFixed(3)}</strong> — ${(cache.yhat*100).toFixed(1)}% Mint.`,
      loss:`Correct answer: <strong>${cache.y}</strong>. Prediction: <strong>${cache.yhat.toFixed(3)}</strong>. Their difference produces a loss of <strong>${cache.loss.toFixed(4)}</strong>. Lower is better.`,
      gradient:`The gradients say how each parameter affected the error. A positive gradient means “reduce this parameter”; a negative one means “increase it.”`,
      update:`Each parameter moved a small step opposite its gradient. This example is finished; next we select example ${(example+1)%10+1}.`
    };$('explanation').innerHTML=messages[phase];$('averageLoss').textContent=losses.length?(losses.reduce((a,b)=>a+b,0)/losses.length).toFixed(4):'—';$('epochValue').textContent=epoch;
  }
  function drawNetwork(){
    const canvas=$('networkCanvas'),c=canvas.getContext('2d'),nodes={x1:[90,100],x2:[90,240],h1:[370,100],h2:[370,240],o:[660,170]};c.clearRect(0,0,canvas.width,canvas.height);
    const weight=(a,b,v,label)=>{c.beginPath();c.moveTo(...a);c.lineTo(...b);c.strokeStyle=v>=0?'#38bdf8':'#fb7185';c.globalAlpha=.72;c.lineWidth=1+Math.abs(v)*4;c.stroke();c.globalAlpha=1;c.fillStyle='#f8fafc';c.font='700 11px ui-monospace';c.textAlign='center';c.fillText(`${label} ${fmt(v)}`,(a[0]+b[0])/2,(a[1]+b[1])/2-5);};
    if(p){weight(nodes.x1,nodes.h1,p.w11,'w₁₁');weight(nodes.x2,nodes.h1,p.w12,'w₁₂');weight(nodes.x1,nodes.h2,p.w21,'w₂₁');weight(nodes.x2,nodes.h2,p.w22,'w₂₂');weight(nodes.h1,nodes.o,p.v1,'v₁');weight(nodes.h2,nodes.o,p.v2,'v₂');}
    const node=(at,name,value,color='#152237')=>{c.beginPath();c.arc(...at,34,0,Math.PI*2);c.fillStyle=color;c.fill();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;c.stroke();c.fillStyle='#f8fafc';c.textAlign='center';c.font='700 14px system-ui';c.fillText(name,at[0],at[1]-3);c.font='11px ui-monospace';c.fillText(value,at[0],at[1]+15);};
    const r=p?data[example]:[0,0,0];node(nodes.x1,'Feature 1',p?r[0].toFixed(2):'—');node(nodes.x2,'Feature 2',p?r[1].toFixed(2):'—');node(nodes.h1,'Hidden 1',cache?cache.h1.toFixed(3):'—',cache?`rgba(94,234,212,${.15+cache.h1*.65})`:'#152237');node(nodes.h2,'Hidden 2',cache?cache.h2.toFixed(3):'—',cache?`rgba(94,234,212,${.15+cache.h2*.65})`:'#152237');node(nodes.o,'Prediction',cache?cache.yhat.toFixed(3):'—',cache?`rgba(56,189,248,${.15+cache.yhat*.65})`:'#152237');
    if(p){[['b₁',p.b1,370,32],['b₂',p.b2,370,308],['bₒ',p.bo,660,92]].forEach(b=>{c.fillStyle='#1f2937';c.fillRect(b[2]-34,b[3]-12,68,24);c.fillStyle='#cbd5e1';c.font='10px ui-monospace';c.fillText(`${b[0]} ${fmt(b[1])}`,b[2],b[3]+4);});}
  }
  function renderCalculation(){
    if(!p){$('calculationTitle').textContent='Not initialized';$('formula').textContent='Weights and biases will appear here.';return;}
    let title='Inputs selected',html=`x₁ = ${data[example][0].toFixed(2)}<br>x₂ = ${data[example][1].toFixed(2)}`;
    if(cache){title='Forward pass';html=`h₁ = sigmoid(x₁·w₁₁ + x₂·w₁₂ + b₁)<br><strong>h₁ = ${cache.h1.toFixed(3)}</strong><br><br>h₂ = sigmoid(x₁·w₂₁ + x₂·w₂₂ + b₂)<br><strong>h₂ = ${cache.h2.toFixed(3)}</strong><span class="result">prediction = sigmoid(h₁·v₁ + h₂·v₂ + bₒ)<br><strong>${cache.yhat.toFixed(3)}</strong></span>`;}
    if(phase==='loss'){title='Binary cross-entropy loss';html=`loss = −[y·ln(ŷ) + (1−y)·ln(1−ŷ)]<span class="result"><strong>loss = ${cache.loss.toFixed(4)}</strong></span>`;}
    if(phase==='gradient'){title='Gradients';html=Object.entries(cache.g).map(([k,v])=>`∂loss/∂${k} = <strong>${fmt(v)}</strong>`).join('<br>');}
    if(phase==='update'){title='Parameter update';html=`new parameter = old parameter − 0.35 × gradient<span class="result">All 9 parameters updated.<br>Ready for the next example.</span>`;}
    $('calculationTitle').textContent=title;$('formula').innerHTML=html;
  }
  function renderParameters(){
    if(!p){$('parameterGrid').innerHTML='<span class="empty">Initialize to see parameters.</span>';return;}
    $('parameterGrid').innerHTML=Object.entries(p).map(([k,v])=>`<div class="parameter ${phase==='update'?'changed':''}"><span>${k}</span><strong>${fmt(v)}</strong></div>`).join('');
  }
  function render(){renderTable();drawData();story();renderCurrent();drawNetwork();renderCalculation();renderParameters();$('nextButton').textContent=phase==='data'?'Next: forward pass':phase==='forward'?'Next: calculate loss':phase==='loss'?'Next: calculate gradients':phase==='gradient'?'Next: update parameters':'Next: next example';}
  function auto(){if(!playing)return;advance();timer=setTimeout(auto,phase==='data'?850:1200);}
  $('initializeButton').onclick=initialize;$('nextButton').onclick=advance;$('resetButton').onclick=()=>location.reload();$('autoButton').onclick=()=>{playing=!playing;$('autoButton').textContent=playing?'Ⅱ Pause':'▶ Auto';clearTimeout(timer);if(playing)auto();};
  renderTable();drawData();drawNetwork();
})();
