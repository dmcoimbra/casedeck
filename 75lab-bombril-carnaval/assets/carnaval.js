/* Confete do Carnaval Bombril: discos vermelhos, brancos e dourados caindo e girando. Só aparece na capa e nas aberturas de capítulo. */
(function(){
  /* pontos de brilho acendendo sobre a lantejoula da abertura "O brilho" */
  ['cap-01','capa'].forEach(function(id){var t=document.getElementById(id);if(!t)return;var r=function(a,b){return a+Math.random()*(b-a);};
    for(var i=0;i<(id==='capa'?22:34);i++){var b=document.createElement('span');b.className='brilhinho';b.style.left=r(2,98)+'%';b.style.top=r(4,96)+'%';
      b.style.setProperty('--s',Math.round(r(26,84))+'px');b.style.setProperty('--d',r(2.4,5.2).toFixed(2)+'s');b.style.setProperty('--t',(-r(0,5)).toFixed(2)+'s');t.appendChild(b);}});
  /* abas de todas as telas: o deck base só liga a primeira tela de cada tipo */
  document.querySelectorAll('.tela').forEach(function(t){var bts=t.querySelectorAll('[data-aba]');if(!bts.length)return;
    bts.forEach(function(b,k){b.addEventListener('click',function(){
      bts.forEach(function(x,j){x.classList.toggle('on',j===k);});
      t.querySelectorAll('[data-painel]').forEach(function(p,j){p.classList.toggle('on',j===k);});
      t.querySelectorAll('[data-p2]').forEach(function(p){p.classList.toggle('on',+p.dataset.p2===k);});});});});
  (function(){var s=document.getElementById('stage'),w=document.getElementById('wrap');if(!s||!w)return;
    function f(){var t=s.querySelector('.tela.ativa');if(!t)return;var v=t.dataset.tema||'escuro';if(v==='lime'&&(t.classList.contains('s-cap')||t.classList.contains('capa-kv')))v='lime-lant';if(w.dataset.fundo!==v)w.dataset.fundo=v;}
    new MutationObserver(f).observe(s,{subtree:true,attributes:true,attributeFilter:['class']});f();})();
  var st=document.getElementById('stage'),cv=document.getElementById('confete');if(!st||!cv)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).has('pdf'))return;
  var cx=cv.getContext('2d'),W=1600,H=900,ps=[],cores=['#FFD000','#FFFFFF','#E30613','#FF7A00','#FFD000','#E30613'],on=false,raf=0;
  cv.width=W;cv.height=H;
  function novo(topo){return{x:Math.random()*W,y:topo?-20-Math.random()*200:Math.random()*H,r:5+Math.random()*11,vy:.6+Math.random()*1.5,vx:-.4+Math.random()*.8,a:Math.random()*6.28,va:.02+Math.random()*.06,f:Math.random()*6.28,vf:.03+Math.random()*.07,c:cores[Math.random()*cores.length|0]};}
  for(var i=0;i<64;i++)ps.push(novo(false));
  function passo(){cx.clearRect(0,0,W,H);
    for(var i=0;i<ps.length;i++){var p=ps[i];p.y+=p.vy;p.x+=p.vx+Math.sin(p.a)*.5;p.a+=p.va;p.f+=p.vf;
      if(p.y>H+24){ps[i]=novo(true);continue;}
      var s=Math.abs(Math.cos(p.f));cx.save();cx.translate(p.x,p.y);cx.rotate(p.a);cx.scale(1,.25+.75*s);
      cx.fillStyle=p.c;cx.globalAlpha=.9;cx.beginPath();cx.arc(0,0,p.r,0,6.283);cx.fill();
      cx.globalAlpha=.35*s;cx.fillStyle='#fff';cx.beginPath();cx.arc(-p.r*.3,-p.r*.3,p.r*.35,0,6.283);cx.fill();cx.restore();}
    if(on)raf=requestAnimationFrame(passo);}
  function ver(){var t=st.querySelector('.tela.ativa'),f=!!t&&(t.classList.contains('s-capa')||t.classList.contains('s-cap'));
    st.classList.toggle('festa',f);if(f&&!on){on=true;raf=requestAnimationFrame(passo);}else if(!f&&on){on=false;cancelAnimationFrame(raf);}}
  new MutationObserver(ver).observe(st,{subtree:true,attributes:true,attributeFilter:['class']});ver();
  /* vídeos só tocam na tela ativa e no painel visível */
  function videos(){document.querySelectorAll('video').forEach(function(v){var t=v.closest('.tela'),p=v.closest('[data-p2],[data-painel]');var vis=t&&t.classList.contains('ativa')&&(!p||p.classList.contains('on'));if(vis){if(v.paused)v.play().catch(function(){});}else if(!v.paused)v.pause();});}
  new MutationObserver(videos).observe(st,{subtree:true,attributes:true,attributeFilter:['class']});videos();
})();
