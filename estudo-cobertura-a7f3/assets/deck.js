/* ============================================================================
   ESTUDO DE SINERGIA DE CAMPO · KC × KV — comportamento
   Navegação: SÓ pelos botões de seta e pelo teclado. Clicar na lâmina não passa
   de slide — era isso que impedia de clicar na caixa de texto.
   ============================================================================ */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const palco=$('#palco'), telas=$$('.tela'), prog=$('#prog i'), cont=$('#cont'), capTxt=$('#capTxt');
const total=telas.length, dd=n=>String(n).padStart(2,'0');
const reduz=matchMedia('(prefers-reduced-motion: reduce)').matches;
let atual=0;

/* miolo: encolhe o conteúdo por igual, mantendo a margem da lâmina */
telas.forEach(t=>{
  const m=document.createElement('div'); m.className='miolo';
  [...t.childNodes].forEach(nd=>m.appendChild(nd));
  t.appendChild(m);
});
function escala(){
  palco.style.transform='scale('+Math.min(innerWidth/1600,innerHeight/900)+')';
}
addEventListener('resize',escala); escala();

/* ------------------------------------------------------------------ números */
const fmt=v=>new Intl.NumberFormat('pt-BR').format(Math.round(v));
const fmt2=v=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const pct=v=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(v)+'%';
function contar(el){
  const alvo=+el.dataset.conta; if(!isFinite(alvo)) return;
  if(reduz){el.textContent=fmt(alvo);return;}
  const t0=performance.now(), dur=1100;
  (function passo(t){
    const p=Math.min(1,(t-t0)/dur), v=alvo*(1-Math.pow(1-p,3));
    el.textContent=(el.textContent.trim().startsWith('+')?'+':'')+fmt(v);
    if(p<1) requestAnimationFrame(passo);
  })(t0);
}

/* ---------------------------------------------------------------- navegação */
function aplicar(n){
  if(n<0||n>=total||n===atual&&telas[n].classList.contains('ativa')) {}
  telas[atual].classList.remove('ativa');
  atual=n; const t=telas[n];
  t.classList.add('ativa');
  capTxt.textContent=lang==='en'?(t.dataset.tituloEn||''):(t.dataset.titulo||'');
  prog.style.width=((n+1)/total*100)+'%';
  cont.textContent=dd(n+1)+' / '+dd(total);
  $('#ant').disabled=n===0; $('#prox').disabled=n===total-1;
  t.querySelectorAll('[data-conta]').forEach(contar);
  $$('#sumLista button').forEach(b=>b.classList.toggle('atual',+b.dataset.i===n));
  history.replaceState(null,'','#'+(n+1));
  if(t.id==='mapa') garantirMapa();
  if(t.id==='interseccao'&&!vennEstado) aplicarFiltro('int');
  if(t.id==='whitespace'&&!document.querySelector('#ws-conteudo table')) wsDesenhar();
}
function ir(n){ if(n<0||n>=total||n===atual) return; aplicar(n); }
$('#ant').addEventListener('click',()=>ir(atual-1));
$('#prox').addEventListener('click',()=>ir(atual+1));
addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1),10); if(!isNaN(n)) ir(n-1);});

/* Teclado: setas, PageUp/Down, Home/End. Nunca espaço — espaço é para digitar.
   E nada disso roda quando o foco está num campo. */
const EDITAVEL=el=>el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable);
addEventListener('keydown',e=>{
  if(EDITAVEL(e.target)) return;
  if($('#sumario').classList.contains('aberto')&&e.key!=='Escape') return;
  const k=e.key;
  if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'){e.preventDefault();ir(atual+1);}
  else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'){e.preventDefault();ir(atual-1);}
  else if(k==='Home'){e.preventDefault();ir(0);}
  else if(k==='End'){e.preventDefault();ir(total-1);}
  else if(k==='Escape'){fecharSum();}
  else if(k==='s'||k==='S'){abrirSum();}
});

/* ------------------------------------------------------------------ sumário */
const sum=$('#sumario'), lista=$('#sumLista');
telas.forEach((t,i)=>{
  const li=document.createElement('li'), b=document.createElement('button');
  b.dataset.i=i;
  b.innerHTML=`<span class="i">${dd(i+1)}</span><span class="t">${t.dataset.titulo}</span>`;
  b.addEventListener('click',()=>{fecharSum();ir(i);});
  li.appendChild(b); lista.appendChild(li);
});
function abrirSum(){sum.classList.add('aberto');}
function fecharSum(){sum.classList.remove('aberto');}
$('#btnSum').addEventListener('click',abrirSum);
$('#fecharSum').addEventListener('click',fecharSum);
$('#verAssim').addEventListener('click',()=>document.body.classList.add('forcar'));

/* ================================================================== IDIOMA */
let lang='pt';
function trocarIdioma(novo){
  if(novo===lang) return;
  lang=novo;
  $$('[data-en]').forEach(el=>{
    if(el.dataset.pt===undefined) el.dataset.pt=el.innerHTML;
    el.innerHTML = lang==='en' ? el.dataset.en : el.dataset.pt;
  });
  const ta=$('#ia-q');
  if(ta){ if(ta.dataset.phPt===undefined) ta.dataset.phPt=ta.placeholder;
          ta.placeholder = lang==='en'?ta.dataset.phEn:ta.dataset.phPt; }
  $$('.s-ia .sug button').forEach(b=>{
    if(b.dataset.qPt===undefined) b.dataset.qPt=b.dataset.q;
    b.dataset.q = lang==='en'?b.dataset.qEn:b.dataset.qPt;
    b.textContent=b.dataset.q;
  });
  $$('#sumLista button').forEach(b=>{
    const s=telas[+b.dataset.i];
    b.querySelector('.t').textContent = lang==='en'?(s.dataset.tituloEn||s.dataset.titulo):s.dataset.titulo;
  });
  capTxt.textContent = lang==='en'?(telas[atual].dataset.tituloEn||''):(telas[atual].dataset.titulo||'');
  document.documentElement.lang = lang==='en'?'en':'pt-BR';
  $$('#idioma button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
  Object.keys(PAINEIS).forEach(p=>{preencher(p);aplicarFiltro(p);});
  if(ultima) render(ultima);
}
$$('#idioma button').forEach(b=>b.addEventListener('click',()=>trocarIdioma(b.dataset.lang)));
const T=(pt,en)=>lang==='en'?en:pt;

/* ================================================================== DADOS */
const D=window.DADOS, C=D.col, DIC=D.dic, N=D.n;
const ROT={regiao:['Região','Region'],uf:['UF','State'],cidade:['Cidade','City'],
  canal:['Canal','Channel'],bandeira:['Bandeira','Banner'],rede:['Rede','Network'],
  clu:['Cluster','Cluster'],cls:['Classificação','Tier'],proj:['Projeto','Project'],
  vaga:['Status da vaga','Vacancy status'],tipo:['Cobertura','Coverage'],
  tipokc:['Tipo de PDV','Store type'],formato:['Formato','Format']};
const TIPO=i=>DIC.tipo[C.tipo[i]];
const ehSh=i=>TIPO(i)==='COMPARTILHADA', ehKC=i=>TIPO(i)==='EXCLUSIVA KC', ehKV=i=>TIPO(i)==='EXCLUSIVA KV';
function filtrar(f){
  const ks=Object.keys(f).filter(k=>f[k]!=='');
  if(!ks.length) return null;
  const out=[];
  for(let i=0;i<N;i++){
    let ok=true;
    for(const k of ks){ if(DIC[k][C[k][i]]!==f[k]){ok=false;break;} }
    if(ok) out.push(i);
  }
  return out;
}
function conta(idx,fn){let t=0; if(idx===null){for(let i=0;i<N;i++) if(fn(i))t++;} else for(const i of idx) if(fn(i))t++; return t;}
function soma(idx,col){let t=0; if(idx===null){for(let i=0;i<N;i++)t+=C[col][i];} else for(const i of idx)t+=C[col][i]; return t;}
function agrupar(idx,dim){
  const m=new Map();
  const add=i=>{
    const c=C[dim][i]; if(c<0) return;
    const k=DIC[dim][c];
    let o=m.get(k); if(!o){o={k,tot:0,sh:0,kc:0,kv:0,fkc:0,fkv:0};m.set(k,o);}
    o.tot++; o[ehSh(i)?'sh':ehKC(i)?'kc':'kv']++; o.fkc+=C.fkc[i]; o.fkv+=C.fkv[i];
  };
  if(idx===null){for(let i=0;i<N;i++)add(i);} else idx.forEach(add);
  return [...m.values()];
}

/* ================================================================= FILTROS */
const PAINEIS={mapa:['regiao','uf','canal','bandeira','tipo'],
               int:['regiao','uf','canal','rede','bandeira','clu'],
               ws:['regiao','uf','cidade','clu','cls','vaga']};
const estado={};
function preencher(p){
  PAINEIS[p].forEach(k=>{
    const sel=$(`#${p}-${k}`); if(!sel) return;
    const antes=sel.value, outros={};
    PAINEIS[p].forEach(o=>{ if(o!==k&&estado[p][o]) outros[o]=estado[p][o]; });
    const idx=filtrar(outros), vis=new Set();
    if(idx===null) DIC[k].forEach(v=>vis.add(v));
    else idx.forEach(i=>{const c=C[k][i]; if(c>=0) vis.add(DIC[k][c]);});
    const L=[...vis].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    sel.innerHTML=`<option value="">${T('Todos','All')}</option>`+L.map(v=>`<option value="${v}">${v}</option>`).join('');
    sel.value=L.includes(antes)?antes:'';
    if(sel.value!==antes) estado[p][k]=sel.value;
  });
}
function aplicarFiltro(p){
  const f=estado[p], idx=filtrar(f);
  const tot=idx===null?N:idx.length;
  const sh=conta(idx,ehSh), kc=conta(idx,ehKC), kv=conta(idx,ehKV);
  const set=(k,v)=>{const el=$(`[data-k="${p}-${k}"]`); if(el) el.textContent=v;};
  set('kc',fmt(sh+kc)); set('kv',fmt(sh+kv)); set('sh',fmt(sh));
  const av=$(`[data-aviso="${p}"]`), ativos=Object.keys(f).filter(k=>f[k]);
  if(av){
    if(ativos.length){av.hidden=false;
      av.textContent=T('Filtrado: ','Filtered: ')+ativos.map(k=>`${ROT[k][lang==='en'?1:0]} = ${f[k]}`).join(' · ')+` · ${fmt(tot)} ${T('lojas','stores')}`;
    } else av.hidden=true;
  }
  if(p==='mapa') desenharMapa(idx);
  if(p==='int') desenharVenn(idx,{sh,kc,kv,tot});
  if(p==='ws') wsDesenhar();
}
Object.keys(PAINEIS).forEach(p=>{estado[p]={};PAINEIS[p].forEach(k=>estado[p][k]='');preencher(p);});
$$('[data-f]').forEach(s=>s.addEventListener('change',()=>{
  const p=s.dataset.painel; estado[p][s.dataset.f]=s.value; preencher(p); aplicarFiltro(p);
}));
$$('[data-limpar]').forEach(b=>b.addEventListener('click',()=>{
  const p=b.dataset.limpar; PAINEIS[p].forEach(k=>estado[p][k]=''); preencher(p); aplicarFiltro(p);
}));

/* ==================================================================== MAPA */
let mapa=null, camada=null, ruas=null;
function garantirMapa(){
  if(mapa || typeof L==='undefined'){ if(mapa) setTimeout(()=>mapa.invalidateSize(),60); return; }
  mapa = L.map('mapaBR',{scrollWheelZoom:true, attributionControl:true,
                         minZoom:3, maxZoom:12, zoomSnap:.5});
  mapa.setView([-15.3,-52.5], 4.2);
  mapa.attributionControl.setPrefix('');
  // Contorno dos estados, servido do próprio material. Sem requisição externa.
  if (window.MALHA_UF){
    L.geoJSON(window.MALHA_UF, {
      style: {color:'#C3CAD6', weight:1, fillColor:'#EEF1F5', fillOpacity:1},
      onEachFeature: function(f, lay){
        lay.bindTooltip(f.properties.uf, {sticky:true, direction:'top', opacity:.95});
        lay.on('mouseover', function(){ lay.setStyle({fillColor:'#E3EAFB'}); });
        lay.on('mouseout',  function(){ lay.setStyle({fillColor:'#EEF1F5'}); });
      }
    }).addTo(mapa);
    mapa.attributionControl.addAttribution('Malha de UF: IBGE');
  }
  camada = L.layerGroup().addTo(mapa);
  // Ruas como camada opcional, num provedor que permite uso publicado.
  const ctrl = L.control({position:'topright'});
  ctrl.onAdd = function(){
    const d = L.DomUtil.create('div','mapa-botoes');
    d.innerHTML = '<button type="button" id="mapa-ruas">'+T('Ver ruas','Street map')+'</button>'+
                  '<button type="button" id="mapa-centrar">'+T('Centralizar','Recentre')+'</button>';
    L.DomEvent.disableClickPropagation(d);
    return d;
  };
  ctrl.addTo(mapa);
  setTimeout(function(){
    const br = document.getElementById('mapa-ruas');
    if (br) br.addEventListener('click', function(){
      if (ruas){ mapa.removeLayer(ruas); ruas=null; br.textContent=T('Ver ruas','Street map'); return; }
      ruas = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {maxZoom:19, opacity:.85, subdomains:'abcd',
         attribution:'&copy; OpenStreetMap, &copy; CARTO'});
      ruas.addTo(mapa); ruas.bringToBack();
      br.textContent = T('Ocultar ruas','Hide streets');
    });
    const bc = document.getElementById('mapa-centrar');
    if (bc) bc.addEventListener('click', function(){ mapa.setView([-15.3,-52.5], 4.2); });
  }, 60);
  setTimeout(()=>mapa.invalidateSize(), 80);
  aplicarFiltro('mapa');
}
function desenharMapa(idx){
  if(!mapa||!camada) return;
  camada.clearLayers();
  const por=new Map();
  const add=i=>{
    const ci=C.cidade[i], ui=C.uf[i]; if(ci<0||ui<0) return;
    const chave=DIC.cidade[ci]+'|'+DIC.uf[ui];
    const g=D.geo[chave]; if(!g) return;
    let o=por.get(chave);
    if(!o){o={lat:g[0],lon:g[1],cidade:DIC.cidade[ci],uf:DIC.uf[ui],tot:0,sh:0,kc:0,kv:0,fkc:0,fkv:0};por.set(chave,o);}
    o.tot++; o[ehSh(i)?'sh':ehKC(i)?'kc':'kv']++; o.fkc+=C.fkc[i]; o.fkv+=C.fkv[i];
  };
  if(idx===null){for(let i=0;i<N;i++)add(i);} else idx.forEach(add);
  const mun=[...por.values()];
  const el=$('[data-k="mapa-mun"]'); if(el) el.textContent=fmt(mun.length);
  const mx=Math.max(...mun.map(m=>m.tot),1);
  mun.sort((a,b)=>b.tot-a.tot).forEach(m=>{
    const temKC=m.kc+m.sh>0, temKV=m.kv+m.sh>0;
    const cor = temKC&&temKV ? '#1E7FB4' : (temKC ? '#0046C8' : '#00B388');
    const r = 3.5+Math.sqrt(m.tot/mx)*16;
    L.circleMarker([m.lat,m.lon],{radius:r,color:cor,weight:1.3,opacity:.95,
      fillColor:cor,fillOpacity:.45})
     .bindPopup('<div class="pop"><b>'+m.cidade+'</b> <span class="l">'+m.uf+'</span><table>'+
       '<tr><td class="l">'+T('Lojas','Stores')+'</td><td><b>'+fmt(m.tot)+'</b></td></tr>'+
       '<tr><td class="l">'+T('Só KC','KC only')+'</td><td>'+fmt(m.kc)+'</td></tr>'+
       '<tr><td class="l">'+T('Compartilhadas','Shared')+'</td><td>'+fmt(m.sh)+'</td></tr>'+
       '<tr><td class="l">'+T('Só KV','KV only')+'</td><td>'+fmt(m.kv)+'</td></tr>'+
       '<tr><td class="l">'+T('Visitas/semana','Visits/week')+'</td><td>KC '+fmt(m.fkc)+
       ' · KV '+fmt(m.fkv)+'</td></tr></table></div>')
     .addTo(camada);
  });
}

/* -------------------------------------------------- exportar a seleção em CSV */
const CSVCOL=[['CNPJ','cnpj'],['Loja','nome'],['Nome na KC','nomekc'],['Cidade','cidade'],
  ['UF','uf'],['Regiao','regiao'],['Rede / cliente','rede'],['Bandeira','bandeira'],
  ['Canal','canal'],['Cluster','clu'],['Classificacao','cls'],['Projeto','proj'],
  ['Status da vaga','vaga'],['Cobertura','tipo'],['Freq semanal KC','fkc'],['Freq semanal KV','fkv']];
function exportar(alvo){
  const f=estado.int||{}, idx=filtrar(f), linhas=[];
  const push=i=>{
    if(alvo!=='TUDO'&&TIPO(i)!==alvo) return;
    linhas.push(CSVCOL.map(function(par){
      const c=par[1];
      if(c==='cnpj'||c==='nome'||c==='nomekc') return D[c]?D[c][i]:'';
      if(c==='fkc'||c==='fkv') return C[c][i];
      const v=C[c][i]; return v>=0?DIC[c][v]:'';
    }));
  };
  if(idx===null){for(let i=0;i<N;i++)push(i);} else idx.forEach(push);
  const ativos=Object.keys(f).filter(k=>f[k]).map(k=>ROT[k][0]+'='+f[k]);
  const nota='Estudo de sinergia de campo · cobertura: '+(alvo==='TUDO'?'todas':alvo)+
    ' · filtros: '+(ativos.length?ativos.join(' | '):'nenhum')+
    ' · '+linhas.length+' lojas · conciliação por CNPJ de 14 dígitos';
  const nome='lojas-'+(alvo==='TUDO'?'todas':alvo.toLowerCase().split(' ').join('-'))+
    (ativos.length?'-filtrado':'')+'.xlsx';
  salvarXLSX([{nome:'Lojas', nota:nota, linhas:[CSVCOL.map(c=>c[0])].concat(linhas)}], nome);
  return linhas.length;
}
$$('[data-exp]').forEach(function(b){
  b.dataset.rotuloPt=b.innerHTML;
  b.addEventListener('click',function(){
    const qtd=exportar(b.dataset.exp);
    const antes=b.innerHTML;
    b.textContent=fmt(qtd)+' '+T('lojas','stores');
    setTimeout(function(){b.innerHTML=antes;},1700);
  });
});



/* ------------------------------------------------- gravar planilha de verdade */
function salvarXLSX(abas, nomeArquivo){
  // abas: [{nome, linhas:[[...]], nota}] — a primeira linha de cada aba é o cabeçalho
  if (typeof XLSX === 'undefined'){ return false; }
  const wb = XLSX.utils.book_new();
  abas.forEach(function(a){
    const corpo = a.nota ? [[a.nota], []].concat(a.linhas) : a.linhas;
    const ws = XLSX.utils.aoa_to_sheet(corpo);
    const larg = (a.linhas[0]||[]).map(function(_, j){
      let m = 10;
      a.linhas.forEach(function(l){ m = Math.max(m, String(l[j]==null?'':l[j]).length + 2); });
      return {wch: Math.min(46, m)};
    });
    ws['!cols'] = larg;
    XLSX.utils.book_append_sheet(wb, ws, a.nome.slice(0,31));
  });
  XLSX.writeFile(wb, nomeArquivo);
  return true;
}

/* ============================================================== WHITE SPACE
   Lista das lojas que uma operação atende e a outra não. O drill down desce
   por região, UF, cidade, bandeira e loja, somando sempre as mesmas linhas:
   nenhum nível recalcula de outro jeito, então os totais fecham entre si. */
const WS_NIVEIS=[
  {chave:'canal',   rot:['Canal','Channel']},
  {chave:'rede',    rot:['Cliente','Client']},
  {chave:'bandeira',rot:['Bandeira','Banner']},
  {chave:'loja',    rot:['Loja','Store']}];
let wsTipo='EXCLUSIVA KV', wsCaminho=[];

function wsLinhas(){
  const f=Object.assign({}, estado.ws||{});
  WS_NIVEIS.forEach((nv,k)=>{ if(wsCaminho[k]!==undefined && nv.chave!=='loja') f[nv.chave]=wsCaminho[k]; });
  const idx=filtrar(f), out=[];
  const quer=i=>TIPO(i)===wsTipo;
  if(idx===null){ for(let i=0;i<N;i++) if(quer(i)) out.push(i); }
  else idx.forEach(i=>{ if(quer(i)) out.push(i); });
  return out;
}
function wsQuemAtende(){
  return wsTipo==='EXCLUSIVA KV' ? 'fkv' : (wsTipo==='EXCLUSIVA KC' ? 'fkc' : null);
}
function wsDesenhar(){
  const alvo=document.getElementById('ws-conteudo'); if(!alvo) return;
  const linhas=wsLinhas(), nivel=wsCaminho.length, nv=WS_NIVEIS[Math.min(nivel,WS_NIVEIS.length-1)];
  const col=wsQuemAtende();
  // migalha
  const mig=document.getElementById('ws-migalha');
  let html='<button data-ws-ir="-1">'+T('Tudo','All')+'</button>';
  wsCaminho.forEach((v,k)=>{ html+='<span class="sep">›</span>'+
    (k===wsCaminho.length-1?'<span class="atual">'+v+'</span>':'<button data-ws-ir="'+k+'">'+v+'</button>'); });
  mig.innerHTML=html;
  mig.querySelectorAll('[data-ws-ir]').forEach(b=>b.addEventListener('click',()=>{
    const k=+b.dataset.wsIr; wsCaminho=k<0?[]:wsCaminho.slice(0,k+1); wsDesenhar();
  }));
  // KPIs
  let freq=0; const muns=new Set();
  linhas.forEach(i=>{ if(col) freq+=C[col][i];
    const ci=C.cidade[i], ui=C.uf[i]; if(ci>=0&&ui>=0) muns.add(DIC.cidade[ci]+'|'+DIC.uf[ui]); });
  const set=(k,v)=>{const e=document.querySelector('[data-k="'+k+'"]'); if(e) e.innerHTML=v;};
  const ROTT={'EXCLUSIVA KV':[ 'Lojas que só a KV atende','Stores only KV serves'],
              'EXCLUSIVA KC':[ 'Lojas que só a KC atende','Stores only KC serves'],
              'COMPARTILHADA':['Lojas que as duas atendem','Stores both serve']};
  set('ws-titulo',T(ROTT[wsTipo][0],ROTT[wsTipo][1]));
  set('ws-n',fmt(linhas.length));
  set('ws-sub',T('de '+fmt(N)+' do universo','of '+fmt(N)+' in the universe'));
  set('ws-freq',col?fmt(freq):fmt(linhas.reduce((t,i)=>t+C.fkc[i]+C.fkv[i],0)));
  set('ws-mun',fmt(muns.size));
  const quem = wsTipo==='EXCLUSIVA KV' ? 'KV' : (wsTipo==='EXCLUSIVA KC' ? 'KC' : T('as duas','both'));
  set('ws-nota', wsTipo==='COMPARTILHADA'
    ? T('Lojas com o mesmo CNPJ nas duas bases. A frequência ao lado soma as duas operações.',
        'Stores with the same tax ID in both bases. The frequency alongside adds up both operations.')
    : T('Essas lojas já recebem visita semanal da '+quem+'. O endereço, o roteiro e o promotor já existem.',
        'These stores already receive a weekly visit from '+quem+'. The address, route and promoter already exist.'));
  // tabela
  if(!linhas.length){
    alvo.innerHTML='<p class="peq" style="padding:22px">'+T('Nenhuma loja neste recorte.','No stores in this cut.')+'</p>';
    return;
  }
  if(nv.chave==='loja'){
    const ord=linhas.slice().sort((a,b)=>(C[col||'fkv'][b]-C[col||'fkv'][a]));
    alvo.innerHTML='<table class="tab"><thead><tr>'+
      ['CNPJ',T('Loja','Store'),T('Cidade','City'),'UF',T('Canal','Channel'),
       T('Freq./sem.','Freq./wk')].map(h=>'<th>'+h+'</th>').join('')+
      '</tr></thead><tbody>'+ord.map(i=>{
        const dv=k=>{const v=C[k][i];return v>=0?DIC[k][v]:'—';};
        return '<tr><td class="ws-loja">'+(D.cnpj[i]||'—')+'</td><td>'+(D.nome[i]||D.nomekc[i]||'—')+
          '</td><td>'+dv('cidade')+'</td><td>'+dv('uf')+'</td><td>'+dv('canal')+'</td><td>'+
          (col?fmt(C[col][i]):fmt(C.fkc[i]+C.fkv[i]))+'</td></tr>';
      }).join('')+'</tbody></table>';
    return;
  }
  const m=new Map();
  linhas.forEach(i=>{
    const ci=C[nv.chave][i], k=ci>=0?DIC[nv.chave][ci]:'(não informado)';
    let o=m.get(k); if(!o){o={k,n:0,f:0,mun:new Set()};m.set(k,o);}
    o.n++; o.f+=col?C[col][i]:(C.fkc[i]+C.fkv[i]);
    const cc=C.cidade[i], uu=C.uf[i]; if(cc>=0&&uu>=0) o.mun.add(DIC.cidade[cc]+'|'+DIC.uf[uu]);
  });
  const g=[...m.values()].sort((a,b)=>b.n-a.n);
  const mx=Math.max(...g.map(x=>x.n),1);
  const proximo=WS_NIVEIS[nivel+1];
  alvo.innerHTML='<table class="tab"><thead><tr>'+
    [nv.rot[lang==='en'?1:0],T('Lojas','Stores'),'%',T('Municípios','Municipalities'),
     T('Visitas/sem.','Visits/wk')].map(h=>'<th>'+h+'</th>').join('')+
    '</tr></thead><tbody>'+g.map(x=>
      '<tr class="'+(proximo?'clica':'')+'" data-ws-desce="'+String(x.k).replace(/"/g,'&quot;')+'">'+
      '<td>'+x.k+'</td><td>'+fmt(x.n)+'</td>'+
      '<td><span class="mb"><i style="--w:'+(100*x.n/mx).toFixed(1)+'%"></i></span>'+
      pct(100*x.n/linhas.length)+'</td>'+
      '<td>'+fmt(x.mun.size)+'</td><td>'+fmt(x.f)+'</td></tr>').join('')+'</tbody></table>';
  if(proximo) alvo.querySelectorAll('[data-ws-desce]').forEach(tr=>
    tr.addEventListener('click',()=>{ wsCaminho.push(tr.dataset.wsDesce); wsDesenhar(); }));
}
function wsExportar(soNivel){
  const linhas=wsLinhas();
  const f=Object.assign({}, estado.ws||{});
  WS_NIVEIS.forEach((nv,k)=>{ if(wsCaminho[k]!==undefined&&nv.chave!=='loja') f[nv.chave]=wsCaminho[k]; });
  const ativos=Object.keys(f).filter(k=>f[k]).map(k=>(ROT[k]?ROT[k][0]:k)+'='+f[k]);
  const nota='Estudo de sinergia de campo · white space · recorte: '+wsTipo+
    ' · '+(ativos.length?ativos.join(' | '):'sem filtro')+
    ' · '+linhas.length+' lojas · conciliação por CNPJ de 14 dígitos';
  let aba;
  if(soNivel){
    const nivel=wsCaminho.length, nv=WS_NIVEIS[Math.min(nivel,WS_NIVEIS.length-1)];
    const col=wsQuemAtende(), m=new Map();
    linhas.forEach(i=>{
      const ci=C[nv.chave]?C[nv.chave][i]:-1;
      const k=nv.chave==='loja'?(D.nome[i]||D.nomekc[i]):(ci>=0?DIC[nv.chave][ci]:'(não informado)');
      let o=m.get(k); if(!o){o={k,n:0,f:0};m.set(k,o);}
      o.n++; o.f+=col?C[col][i]:(C.fkc[i]+C.fkv[i]);
    });
    aba={nome:'Resumo', nota:nota, linhas:[[nv.rot[0],'Lojas','Percentual','Visitas por semana']]
      .concat([...m.values()].sort((a,b)=>b.n-a.n).map(x=>
        [x.k, x.n, +(100*x.n/linhas.length).toFixed(1), x.f]))};
  } else {
    aba={nome:'Lojas', nota:nota, linhas:[CSVCOL.map(c=>c[0])].concat(linhas.map(i=>
      CSVCOL.map(function(par){
        const c=par[1];
        if(c==='cnpj'||c==='nome'||c==='nomekc') return D[c]?D[c][i]:'';
        if(c==='fkc'||c==='fkv') return C[c][i];
        const v=C[c][i]; return v>=0?DIC[c][v]:'';
      })))};
  }
  const nome=('white-space-'+wsTipo.toLowerCase().split(' ').join('-')+
    (wsCaminho.length?'-'+wsCaminho.join('-').toLowerCase().split(' ').join('-'):'')+
    (soNivel?'-resumo':'-lojas')+'.xlsx').replace(/[^a-z0-9.\-]/gi,'-');
  salvarXLSX([aba], nome);
  return linhas.length;
}
$$('#ws-perspectiva button').forEach(b=>b.addEventListener('click',()=>{
  $$('#ws-perspectiva button').forEach(x=>x.classList.toggle('on',x===b));
  wsTipo=b.dataset.ws; wsCaminho=[]; wsDesenhar();
}));
['ws-exp-csv','ws-exp-nivel'].forEach((id,k)=>{
  const b=document.getElementById(id); if(!b) return;
  b.addEventListener('click',()=>{
    const n=wsExportar(k===1), antes=b.innerHTML;
    b.textContent=fmt(n)+' '+T('lojas','stores');
    setTimeout(()=>{b.innerHTML=antes;},1700);
  });
});


/* ========================================================== IA ANALÍTICA REAL
   O modelo interpreta a pergunta e escreve a leitura; quem calcula é o navegador,
   sobre as linhas da base. O modelo recebe o esquema e os resultados da consulta —
   nunca inventa número.
   Dois provedores, reconhecidos pelo formato da chave:
     AIza…    -> Google Gemini
     sk-ant-… -> Anthropic
   A chave fica só no sessionStorage de quem usa; não vai para o arquivo publicado. */
const IA_GEMINI  = 'gemini-2.0-flash';
const IA_CLAUDE  = 'claude-sonnet-5-5';
function iaChave(){ try{ return sessionStorage.getItem('ia_chave')||''; }catch(e){ return ''; } }
function iaGuardar(k){ try{ sessionStorage.setItem('ia_chave', k); }catch(e){} }
function iaEsquecer(){ try{ sessionStorage.removeItem('ia_chave'); }catch(e){} }
function iaProvedor(k){
  k=(k||'').trim();
  if(k.indexOf('sk-ant')===0) return 'anthropic';
  if(k.indexOf('AIza')===0) return 'gemini';
  return k ? 'gemini' : null;          // chave de formato novo: tenta o Gemini
}
function iaModelo(){ return iaProvedor(iaChave())==='anthropic' ? IA_CLAUDE : IA_GEMINI; }

/* ---------------- a ferramenta: campos planos, aceitos pelos dois provedores */
const IA_CAMPOS = {
  f_uf:        'Sigla do estado, por exemplo SP.',
  f_regiao:    'Região do país: Sudeste, Sul, Nordeste, Norte, Centro-Oeste.',
  f_cidade:    'Nome do município.',
  f_canal:     'Canal: FARMA, ALIMENTAR, CASH & CARRY, PERFUMARIA.',
  f_rede:      'Cliente (rede), com o nome oficial harmonizado.',
  f_bandeira:  'Bandeira da loja.',
  f_cluster:   'Cluster operacional da KV.',
  f_classificacao: 'Classificação da KV: DIAMANTE, OURO, PRATA, BRONZE.',
  f_projeto:   'Projeto da KV: REGULAR, EXPANSÃO 4.0, EXPANSÃO 4.1, EXPANSÃO 4.2, NOVAS LOJAS - AGOSTO.',
  f_vaga:      'Status da vaga na KV: ATIVO, VAGA EM ABERTO, ATIVO FERISTA, FÉRIAS, ATIVO FERISTA FIXO.',
  f_cobertura: 'Tipo de cobertura: COMPARTILHADA, EXCLUSIVA KC ou EXCLUSIVA KV.'
};
const IA_MAPA_CAMPO = {f_uf:'uf', f_regiao:'regiao', f_cidade:'cidade', f_canal:'canal',
  f_rede:'rede', f_bandeira:'bandeira', f_cluster:'clu', f_classificacao:'cls',
  f_projeto:'proj', f_vaga:'vaga', f_cobertura:'tipo'};
const IA_DESC = 'Consulta a base de lojas do estudo e devolve contagens e somas REAIS. '+
  'Chame esta ferramenta antes de afirmar qualquer número. Nunca estime. '+
  'Para saber o maior cliente de um canal, filtre por f_canal e agrupe por rede.';
function iaPropriedades(){
  const p = {};
  Object.keys(IA_CAMPOS).forEach(k => { p[k] = {type:'string', description: IA_CAMPOS[k]}; });
  p.agrupar_por = {type:'string', description:
    'Dimensão de agrupamento: uf, regiao, cidade, canal, rede, bandeira, cluster, '+
    'classificacao, projeto, vaga, cobertura. Omita para ter só o total do recorte.'};
  p.ordenar_por = {type:'string', description:
    'Campo de ordenação decrescente: lojas, compartilhadas, exclusivas_kc, exclusivas_kv, '+
    'visitas_kc, visitas_kv, visitas_total.'};
  p.limite = {type:'integer', description:'Linhas do agrupamento. Padrão 15, máximo 60.'};
  p.listar_lojas = {type:'boolean', description:
    'true devolve as lojas individuais do recorte, no máximo 40.'};
  return p;
}
const IA_GRUPO = {uf:'uf', regiao:'regiao', cidade:'cidade', canal:'canal', rede:'rede',
  bandeira:'bandeira', cluster:'clu', classificacao:'cls', projeto:'proj', vaga:'vaga',
  cobertura:'tipo'};

function iaExecutar(args){
  args = args || {};
  const f = {};
  Object.keys(IA_MAPA_CAMPO).forEach(function(k){
    if (args[k]) f[IA_MAPA_CAMPO[k]] = String(args[k]);
  });
  const idx = filtrar(f);
  const tot = idx===null ? N : idx.length;
  const sh = conta(idx, ehSh), kc = conta(idx, ehKC), kv = conta(idx, ehKV);
  const fkc = soma(idx,'fkc'), fkv = soma(idx,'fkv');
  let shk=0, shv=0;
  const acc = i => { if (ehSh(i)) { shk += C.fkc[i]; shv += C.fkv[i]; } };
  if (idx===null) { for (let i=0;i<N;i++) acc(i); } else idx.forEach(acc);
  const out = {
    filtros_aplicados: Object.keys(f).length ? f : 'nenhum (universo inteiro)',
    lojas_no_recorte: tot,
    lojas_kc: sh+kc, lojas_kv: sh+kv,
    compartilhadas: sh, exclusivas_kc: kc, exclusivas_kv: kv,
    kc_passa_a_cobrir: kv, kv_passa_a_cobrir: kc,
    visitas_semana_kc: fkc, visitas_semana_kv: fkv,
    frequencia_media_compartilhada_kc: sh ? +(shk/sh).toFixed(2) : null,
    frequencia_media_compartilhada_kv: sh ? +(shv/sh).toFixed(2) : null,
    frequencia_media_compartilhada_combinada: sh ? +((shk+shv)/sh).toFixed(2) : null
  };
  const dim = IA_GRUPO[args.agrupar_por] || (DIC[args.agrupar_por] ? args.agrupar_por : null);
  if (dim) {
    const g = agrupar(idx, dim).map(x => ({ valor:x.k, lojas:x.tot, compartilhadas:x.sh,
      exclusivas_kc:x.kc, exclusivas_kv:x.kv, visitas_kc:x.fkc, visitas_kv:x.fkv,
      visitas_total:x.fkc+x.fkv, pct_compartilhada:+(100*x.sh/x.tot).toFixed(1) }));
    const ord = args.ordenar_por || 'lojas';
    g.sort((a,b) => (b[ord]||0) - (a[ord]||0));
    out.agrupado_por = args.agrupar_por || dim;
    out.total_de_grupos = g.length;
    out.linhas = g.slice(0, Math.min(args.limite||15, 60));
  }
  if (args.listar_lojas) {
    const lst = [];
    const push = i => { if (lst.length < 40) lst.push({ cnpj:D.cnpj[i]||'',
      loja:D.nome[i]||D.nomekc[i]||'', cidade:C.cidade[i]>=0?DIC.cidade[C.cidade[i]]:'',
      uf:C.uf[i]>=0?DIC.uf[C.uf[i]]:'', canal:C.canal[i]>=0?DIC.canal[C.canal[i]]:'',
      cobertura:TIPO(i), freq_kc:C.fkc[i], freq_kv:C.fkv[i] }); };
    if (idx===null) { for (let i=0;i<N && lst.length<40;i++) push(i); } else idx.forEach(push);
    out.lojas = lst;
    if (tot > 40) out.aviso = 'mostrando 40 de ' + tot + ' lojas';
  }
  return out;
}

function iaEsquema(){
  const amostra = (k,n) => DIC[k].slice(0,n).join(' | ') +
    (DIC[k].length>n ? ' …(+'+(DIC[k].length-n)+' outros)' : '');
  return [
    'BASE: '+N+' lojas de duas operações de merchandising, conciliadas por CNPJ de 14 dígitos.',
    'KC e KV são as duas operações. COMPARTILHADA = o mesmo CNPJ está nas duas bases.',
    'EXCLUSIVA KV = só a KV atende: é o white space da KC, o que a KC passa a cobrir.',
    'EXCLUSIVA KC = só a KC atende: é o white space da KV.',
    '',
    'VALORES DAS DIMENSÕES:',
    '  cobertura: '+DIC.tipo.join(' | '),
    '  canal: '+DIC.canal.join(' | '),
    '  regiao: '+DIC.regiao.join(' | '),
    '  uf: '+DIC.uf.join(' | '),
    '  classificacao: '+DIC.cls.join(' | '),
    '  cluster: '+DIC.clu.join(' | '),
    '  projeto: '+DIC.proj.join(' | '),
    '  vaga: '+DIC.vaga.join(' | '),
    '  rede (cliente): '+amostra('rede',14),
    '  bandeira: '+amostra('bandeira',14),
    '  cidade: '+DIC.cidade.length+' municípios',
    '',
    'MEDIDAS: lojas, compartilhadas, exclusivas_kc, exclusivas_kv, visitas_semana_kc,',
    'visitas_semana_kv. A frequência é semanal e declarada por loja em cada base.',
    '',
    'NÃO EXISTE na base: duração da visita da KC, jornada contratada, deslocamento da KC,',
    'custo, salário, encargo, faturamento, ruptura, capacidade ociosa. Se a pergunta',
    'depender de um desses, diga que não é calculável e liste o que falta.'
  ].join('\n');
}
const IA_SISTEMA = [
  'Você é um analista de dados de trade marketing respondendo a uma diretoria.',
  'Use SEMPRE a ferramenta consultar_base antes de afirmar qualquer número.',
  'Responda exatamente o que foi perguntado. Não devolva um panorama genérico.',
  'Pode chamar a ferramenta várias vezes para comparar recortes.',
  'Responda em português do Brasil, frases curtas e completas, linguagem simples.',
  'Estruture a resposta com estas marcações, nesta ordem:',
  '[DIRETA] uma frase com a resposta, já com o número principal.',
  '[EVIDENCIA] dois ou três períodos com os números que sustentam.',
  '[TABELA] opcional: uma linha por registro, colunas separadas por ponto e vírgula,',
  '  a primeira linha é o cabeçalho. Use quando houver ranking ou comparação.',
  '[INTERPRETACAO] o que o resultado significa para a operação.',
  '[RECOMENDACAO] a implicação prática. Não sugira projeto piloto.',
  'Número no padrão brasileiro: ponto no milhar, vírgula no decimal.',
  'Se o dado não existir na base, diga isso com todas as letras.'
].join('\n');

/* ------------------------------------------------------------------ Gemini */
async function iaGeminiPerguntar(pergunta, chave, consultas){
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'+IA_GEMINI+
              ':generateContent?key='+encodeURIComponent(chave);
  const contents = [{role:'user', parts:[{text: pergunta}]}];
  const corpo = () => ({
    system_instruction: {parts:[{text: IA_SISTEMA + '\n\n' + iaEsquema()}]},
    contents: contents,
    tools: [{function_declarations:[{name:'consultar_base', description:IA_DESC,
      parameters:{type:'object', properties: iaPropriedades()}}]}],
    generationConfig: {temperature: 0.2, maxOutputTokens: 2048}
  });
  for (let volta=0; volta<5; volta++){
    const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'},
                               body: JSON.stringify(corpo())});
    if (!r.ok){
      const t = await r.text();
      throw new Error(r.status===400 ? 'o Gemini recusou a chamada: '+t.slice(0,160)
        : r.status===403 ? 'chave recusada pelo Gemini'
        : r.status===429 ? 'limite de uso do Gemini atingido'
        : 'o Gemini respondeu '+r.status+': '+t.slice(0,160));
    }
    const j = await r.json();
    const cand = (j.candidates||[])[0];
    if (!cand) throw new Error('o Gemini não devolveu resposta');
    const parts = (cand.content && cand.content.parts) || [];
    contents.push({role:'model', parts: parts});
    const chamadas = parts.filter(p => p.functionCall);
    if (!chamadas.length){
      const texto = parts.filter(p => p.text).map(p => p.text).join('\n');
      return {texto: texto, consultas: consultas, uso: j.usageMetadata||null};
    }
    contents.push({role:'user', parts: chamadas.map(function(p){
      let saida; try { saida = iaExecutar(p.functionCall.args||{}); }
      catch(e){ saida = {erro:String(e)}; }
      consultas.push({pedido:p.functionCall.args||{}, linhas:saida.lojas_no_recorte});
      return {functionResponse:{name:p.functionCall.name, response:{resultado: saida}}};
    })});
  }
  throw new Error('a consulta não convergiu em cinco voltas');
}

/* --------------------------------------------------------------- Anthropic */
async function iaClaudePerguntar(pergunta, chave, consultas){
  const corpo = {model: IA_CLAUDE, max_tokens: 2048,
    system: IA_SISTEMA + '\n\n' + iaEsquema(),
    tools: [{name:'consultar_base', description:IA_DESC,
      input_schema:{type:'object', properties: iaPropriedades()}}],
    messages: [{role:'user', content: pergunta}]};
  const cab = {'Content-Type':'application/json','x-api-key':chave,
    'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
  for (let volta=0; volta<5; volta++){
    const r = await fetch('https://api.anthropic.com/v1/messages',
      {method:'POST', headers:cab, body:JSON.stringify(corpo)});
    if (!r.ok){
      const t = await r.text();
      throw new Error(r.status===401 ? 'chave recusada pela Anthropic'
        : r.status===429 ? 'limite de uso atingido'
        : 'a API respondeu '+r.status+': '+t.slice(0,160));
    }
    const resp = await r.json();
    corpo.messages.push({role:'assistant', content: resp.content});
    const usos = (resp.content||[]).filter(b => b.type==='tool_use');
    if (!usos.length){
      const texto = (resp.content||[]).filter(b => b.type==='text').map(b => b.text).join('\n');
      return {texto: texto, consultas: consultas, uso: resp.usage||null};
    }
    corpo.messages.push({role:'user', content: usos.map(function(u){
      let saida; try { saida = iaExecutar(u.input||{}); }
      catch(e){ saida = {erro:String(e)}; }
      consultas.push({pedido:u.input||{}, linhas:saida.lojas_no_recorte});
      return {type:'tool_result', tool_use_id:u.id, content: JSON.stringify(saida)};
    })});
  }
  throw new Error('a consulta não convergiu em cinco voltas');
}

async function iaPerguntar(pergunta, chave){
  const consultas = [];
  return iaProvedor(chave)==='anthropic'
    ? iaClaudePerguntar(pergunta, chave, consultas)
    : iaGeminiPerguntar(pergunta, chave, consultas);
}

/* ------------------------------------------------------- resposta na tela */
function iaRender(r, pergunta){
  const bloco = (tag) => {
    const m = r.texto.match(new RegExp('\\[' + tag + '\\]([\\s\\S]*?)(?=\\[[A-Z]+\\]|$)'));
    return m ? m[1].trim() : '';
  };
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const tab = bloco('TABELA');
  let tabHtml = '';
  if (tab){
    const ls = tab.split('\n').map(l => l.split(';').map(c => c.trim())).filter(l => l.length>1);
    if (ls.length>1)
      tabHtml = '<h4>'+T('Visualização','Visualisation')+'</h4><table class="tab"><thead><tr>'+
        ls[0].map(c => '<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+
        ls.slice(1).map(l => '<tr>'+l.map(c => '<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+
        '</tbody></table>';
  }
  const direta = bloco('DIRETA') || r.texto.slice(0,240);
  const H = ['<div class="resp">'];
  H.push('<span class="selo comprovado" style="position:static;display:inline-flex;margin-bottom:14px">'+
    T('Calculado sobre a base','Computed over the base')+'</span>');
  H.push('<h4>'+T('Resposta direta','Direct answer')+'</h4><p class="direta">'+esc(direta)+'</p>');
  if (bloco('EVIDENCIA')) H.push('<h4>'+T('Evidência','Evidence')+'</h4><p>'+esc(bloco('EVIDENCIA'))+'</p>');
  if (tabHtml) H.push(tabHtml);
  if (bloco('INTERPRETACAO')) H.push('<h4>'+T('Interpretação','Interpretation')+'</h4><p>'+esc(bloco('INTERPRETACAO'))+'</p>');
  if (bloco('RECOMENDACAO')) H.push('<h4>'+T('Recomendação','Recommendation')+'</h4><p>'+esc(bloco('RECOMENDACAO'))+'</p>');
  if (!bloco('DIRETA') && !bloco('EVIDENCIA')) H.push('<p>'+esc(r.texto)+'</p>');
  H.push('<h4>'+T('Rastreabilidade','Traceability')+'</h4><p class="rastro">'+
    T('Pergunta','Question')+': '+esc(pergunta)+'<br>'+
    T('Consultas à base','Queries run')+': '+r.consultas.length+
    (r.consultas.length ? ' — '+esc(r.consultas.map(c =>
      Object.keys(c.pedido).filter(k=>k.indexOf('f_')===0).map(k=>c.pedido[k]).join('+') ||
      (c.pedido.agrupar_por ? 'por '+c.pedido.agrupar_por : 'universo')).join(' · ')) : '')+'<br>'+
    T('Modelo','Model')+': '+iaModelo()+' — '+
    T('ele interpreta e escreve; o cálculo roda no navegador sobre as '+fmt(N)+' lojas',
      'it interprets and writes; the computation runs in the browser over all '+fmt(N)+' stores')+
    '</p>');
  H.push('<div class="acoes"><button class="botao mini" id="ia-copiar">'+T('Copiar','Copy')+'</button>'+
    '<button class="botao mini" id="ia-volta">'+T('Voltar aos arquivos','Back to files')+'</button></div></div>');
  const s = $('#ia-saida');
  s.dataset.arquivos = s.dataset.arquivos || s.innerHTML;
  s.innerHTML = H.join(''); s.scrollTop = 0;
  $('#ia-copiar').addEventListener('click', e => {
    navigator.clipboard.writeText(s.innerText).then(() => {
      e.target.textContent = T('Copiado','Copied');
      setTimeout(() => e.target.textContent = T('Copiar','Copy'), 1500);
    });
  });
  $('#ia-volta').addEventListener('click', () => { s.innerHTML = s.dataset.arquivos; ultima = null; });
}

/* ========================================================= MOTOR ANALÍTICO */
let ultima=null, contexto={};
const ESTADO=$('#ia-estado');
function dizEstado(){
  if(!ESTADO) return;
  const temChave = !!iaChave();
  const cx = document.getElementById('ia-chave-cx');
  if (cx) cx.dataset.ligada = temChave ? 'sim' : 'nao';
  const bt = document.getElementById('ia-ligar');
  if (bt) bt.textContent = temChave ? T('Desconectar','Disconnect') : T('Conectar','Connect');
  const cmp = document.getElementById('ia-chave');
  if (cmp) cmp.style.display = temChave ? 'none' : '';
  if (temChave){
    ESTADO.innerHTML = T('IA conectada: '+iaModelo()+' interpreta e escreve, o navegador calcula sobre as 7.934 lojas. A chave fica só neste navegador e some ao fechar a aba.',
      'AI connected: '+iaModelo()+' interprets and writes, the browser computes over all 7,934 stores. The key stays in this browser only and is gone when the tab closes.');
    return;
  }
  ESTADO.innerHTML = T(
    'Sem IA conectada: as respostas saem de um motor determinístico, que calcula certo mas não redige. Conecte uma chave para ter a IA escrevendo a leitura.',
    'No AI connected: answers come from a deterministic engine that computes correctly but does not write. Connect a key to have the AI write the reading.');
}
(function ligarChave(){
  const bt = document.getElementById('ia-ligar');
  if (!bt) return;
  bt.addEventListener('click', function(){
    if (iaChave()) { iaEsquecer(); dizEstado(); return; }
    const campo = document.getElementById('ia-chave');
    const v = (campo && campo.value || '').trim();
    if (!v) { if (campo) campo.focus(); return; }
    iaGuardar(v); if (campo) campo.value = ''; dizEstado();
  });
})();
dizEstado();

const SIN={'sp':'SP','sao paulo':'SP','são paulo':'SP','rio':'RJ','rio de janeiro':'RJ','minas':'MG',
 'minas gerais':'MG','bahia':'BA','parana':'PR','paraná':'PR','farmacia':'FARMA','farmácia':'FARMA',
 'farmacias':'FARMA','farmácias':'FARMA','pharmacy':'FARMA','drogaria':'FARMA','drogarias':'FARMA',
 'alimentar':'ALIMENTAR','food':'ALIMENTAR','supermercado':'ALIMENTAR','atacarejo':'CASH & CARRY',
 'atacado':'CASH & CARRY','perfumaria':'PERFUMARIA','sudeste':'Sudeste','nordeste':'Nordeste',
 'sul':'Sul','norte':'Norte','centro-oeste':'Centro-Oeste','centro oeste':'Centro-Oeste',
 'vaga em aberto':'VAGA EM ABERTO','vagas em aberto':'VAGA EM ABERTO','diamante':'DIAMANTE',
 'ouro':'OURO','prata':'PRATA','bronze':'BRONZE'};
const SEMDADO=[
 [/(desligar|desligamento|demitir|reduzir quadro|redu(c|ç)(a|ã)o de quadro|headcount|lay ?off)/i,['redução de quadro','headcount reduction']],
 [/(econom|custo|salari|salári|encargo|r\$|reais|financeir|saving)/i,['economia financeira','financial savings']],
 [/(ocios|capacidade dispon|idle|sobra de tempo|hora liberada|horas liberadas)/i,['capacidade ociosa','idle capacity']],
 [/(ruptura|faturamento|venda|sell ?out|revenue)/i,['faturamento e ruptura','revenue and stockouts']]];
const FALTA=[['Duração da visita da KC, por loja','KC visit duration, per store'],
 ['Jornada contratada nas duas operações','Contracted journey in both operations'],
 ['Tempo de deslocamento da KC','KC travel time'],
 ['Tempo incremental para a segunda marca na mesma visita','Incremental time for a second brand in the same visit'],
 ['Custo de pessoal, encargos e deslocamento','Personnel, payroll and travel costs'],
 ['Visitas efetivamente realizadas','Visits actually performed']];

function interpretar(p){
  // pontuação vira espaço: sem isso 'DROGASIL?' não casa com ' drogasil '
  const q=' '+p.toLowerCase().replace(/[“”"'`´]/g,' ').replace(/[?!.,;:()\[\]]/g,' ')
    .replace(/\s+/g,' ')+' ';
  const r={filtros:{},dim:null,metrica:'ganho_kc',topn:null,sem:null};
  for(const [re,t] of SEMDADO) if(re.test(p)){r.sem=t;break;}
  // Valores do dicionário primeiro, do mais longo para o mais curto: assim
  // 'MART MINAS' é reconhecido antes de qualquer pedaço dele.
  const reconhecidos=[];
  const DIMS_FILTRO=['uf','regiao','cidade','canal','rede','bandeira','clu','cls','proj','vaga','tipo'];
  for(const k of DIMS_FILTRO){
    const vals=DIC[k]||[];
    const ord=vals.slice().sort((a,b)=>b.length-a.length);
    for(const v of ord){
      if(v.length<3) continue;
      if(q.includes(' '+v.toLowerCase()+' ')){ r.filtros[k]=v; reconhecidos.push(v.toLowerCase()); break; }
    }
  }
  // Sinônimo só vale se não estiver dentro de um nome já reconhecido.
  for(const [t,v] of Object.entries(SIN)){
    const soCidade = r.filtros.cidade && r.filtros.cidade.toLowerCase()===t;
    if(!soCidade && reconhecidos.some(n=>n.indexOf(t)>=0)) continue;
    if(q.includes(' '+t+' ')||q.includes(' '+t+'?')||q.includes(' '+t+'.')){
      if(DIC.uf.includes(v)&&!r.filtros.uf){
        r.filtros.uf=v;
        // "em São Paulo" é o estado; a cidade homônima sai do recorte
        if(r.filtros.cidade&&r.filtros.cidade.toLowerCase()===t) delete r.filtros.cidade;
      }
      else if(DIC.canal.includes(v)&&!r.filtros.canal) r.filtros.canal=v;
      else if(DIC.regiao.includes(v)&&!r.filtros.regiao) r.filtros.regiao=v;
      else if(DIC.vaga.includes(v)&&!r.filtros.vaga) r.filtros.vaga=v;
      else if(DIC.cls.includes(v)&&!r.filtros.cls) r.filtros.cls=v;
    }
  }
  const DIMS=[[/\b(bandeira|bandeiras|banner)/,'bandeira'],[/\b(rede|redes|network|cliente)/,'rede'],
    [/\b(estado|estados|uf|state)/,'uf'],[/\b(regi(ao|ão|oes|ões)|region)/,'regiao'],
    [/\b(cidade|cidades|munic|city)/,'cidade'],[/\b(canal|canais|channel)/,'canal'],
    [/\b(cluster)/,'clu'],[/\b(classifica|tier|diamante|ouro|prata|bronze)/,'cls'],
    [/\b(projeto|project|expans)/,'proj']];
  for(const [re,d] of DIMS) if(re.test(q)){r.dim=d;break;}
  if(/\b(sobreposi|compartilhad|em comum|overlap|shared)/.test(q)) r.metrica='compartilhadas';
  if(/\b(vaga|vacanc)/.test(q)) r.metrica='vagas';
  if(/\b(frequen|frequên|visita|visits|frequency)/.test(q)) r.metrica='frequencia';
  if(/\b(kv (passa|pode)|ganho da kv|kv gain|para a kv)/.test(q)) r.metrica='ganho_kv';
  if(/\b(falta|faltam|precisa|missing|needed)/.test(q)) r.metrica='faltantes';
  // "quantas lojas de X temos" é contagem, não ganho de cobertura
  const pedeCobertura=/\b(passa a cobrir|ganha|ganho|novas|alcan|white ?space|expand)\b/.test(q);
  if(/\b(quant[ao]s?|how many|total de|numero de|número de)\b/.test(q) && !pedeCobertura)
    r.metrica='contagem';
  // "quais as dez bandeiras com mais lojas" é ranking de contagem, não de ganho
  if(r.dim && !pedeCobertura && r.metrica==='ganho_kc' &&
     /\b(quais|maiores|ranking|top|com mais|principais|which|largest)\b/.test(q))
    r.metrica='contagem';
  const m=q.match(/\b(dez|10|cinco|5|vinte|20|tres|três|3|quinze|15)\b/);
  if(m) r.topn={dez:10,'10':10,cinco:5,'5':5,vinte:20,'20':20,tres:3,'três':3,'3':3,quinze:15,'15':15}[m[1]];
  // Herdar o recorte anterior só quando a frase é mesmo um complemento: começa
  // com "e"/"and", ou é curtíssima e não traz nenhum filtro próprio. Antes,
  // qualquer pergunta com menos de 40 letras puxava o filtro da anterior.
  const complemento = /^\s*(e|and)\s/i.test(p) ||
    (p.trim().length < 26 && Object.keys(r.filtros).length === 0);
  if(complemento){
    r.filtros=Object.assign({},contexto.filtros||{},r.filtros);
    if(!r.dim&&contexto.dim) r.dim=contexto.dim;
    // "e no alimentar?" continua sendo a mesma pergunta, noutro recorte
    if(contexto.metrica && r.metrica==='ganho_kc') r.metrica=contexto.metrica;
  }
  return r;
}
function responder(p){
  const r=interpretar(p), idx=filtrar(r.filtros);
  const tot=idx===null?N:idx.length;
  const sh=conta(idx,ehSh), xkc=conta(idx,ehKC), xkv=conta(idx,ehKV);
  const ckc=sh+xkc, ckv=sh+xkv;
  const fkc=soma(idx,'fkc'), fkv=soma(idx,'fkv');
  let shk=0,shv=0;
  const acc=i=>{if(ehSh(i)){shk+=C.fkc[i];shv+=C.fkv[i];}};
  if(idx===null){for(let i=0;i<N;i++)acc(i);} else idx.forEach(acc);
  const ctx=Object.entries(r.filtros).map(([k,v])=>`${ROT[k]?ROT[k][lang==='en'?1:0]:k} = ${v}`).join(' · ')||T('universo inteiro','entire universe');
  const o={pergunta:p,r,rastro:{filtros:ctx,linhas:tot}};

  if(r.sem||r.metrica==='faltantes'){
    o.classe='naocalc';
    o.direta=r.sem?T('Não é calculável com estes dois arquivos.','Not calculable with these two files.')
                  :T('Seis campos separam este estudo de um dimensionamento.','Six fields separate this study from a sizing exercise.');
    o.evid=r.sem
      ? T(`A pergunta pede ${r.sem[0]}. Nenhum dos dois roteiros traz esse dado, e preencher a lacuna com média de mercado seria inventar o número. O que os arquivos mostram é onde está a oportunidade: ${fmt(sh)} lojas recebem hoje as duas operações, somando ${fmt(shk+shv)} visitas por semana.`,
          `The question asks for ${r.sem[1]}. Neither route file carries that data, and filling the gap with a market average would be inventing the figure. What the files do show is where the opportunity sits: ${fmt(sh)} stores receive both operations today, totalling ${fmt(shk+shv)} visits a week.`)
      : T('Nenhum deles está nos dois roteiros recebidos.','None of them is in the two route files received.');
    o.tab={cols:[T('Dado que falta','Missing data')],linhas:FALTA.map(d=>[d[lang==='en'?1:0]])};
    o.interp=T('A diferença entre diagnóstico e dimensionamento é exatamente essa lista.','The difference between a diagnosis and a sizing exercise is exactly that list.');
    return o;
  }
  if(r.metrica==='vagas'){
    const iv=filtrar(Object.assign({},r.filtros,{vaga:'VAGA EM ABERTO'}))||[];
    const vt=iv.length, vsh=conta(iv,ehSh), vkv=conta(iv,ehKV), vfk=soma(iv,'fkv');
    o.classe='comprovado';
    o.direta=T(`${fmt(vsh)} de ${fmt(vt)} lojas com vaga em aberto já recebem a visita da KC.`,
               `${fmt(vsh)} of ${fmt(vt)} stores with an open vacancy already receive a KC visit.`);
    o.evid=T(`No corte ${ctx} há ${fmt(vt)} lojas da KV sem profissional designado, somando ${fmt(vfk)} visitas por semana na programação. Dessas, ${fmt(vsh)} têm cobertura KC e ${fmt(vkv)} não têm nenhuma.`,
             `In the ${ctx} cut there are ${fmt(vt)} KV stores with no assigned professional, totalling ${fmt(vfk)} scheduled visits a week. Of those, ${fmt(vsh)} have KC coverage and ${fmt(vkv)} have none.`);
    const g=agrupar(iv,r.dim||'uf').sort((a,b)=>b.tot-a.tot).slice(0,r.topn||10);
    o.barras={rot:ROT[r.dim||'uf'][lang==='en'?1:0],itens:g.map(x=>({k:x.k,v:x.tot}))};
    o.interp=T('Vaga em aberto é cobertura cadastrada sem gente, não promotor disponível.',
               'An open vacancy is registered coverage without a person, not an available promoter.');
    o.rastro.filtros=ctx+' · '+T('status da vaga = VAGA EM ABERTO','vacancy status = VAGA EM ABERTO');
    o.rastro.linhas=vt;
    return o;
  }
  if(r.metrica==='frequencia'){
    o.classe='oportunidade';
    o.direta=T(`Nas ${fmt(sh)} lojas compartilhadas as duas operações somam ${fmt(shk+shv)} visitas por semana.`,
               `In the ${fmt(sh)} shared stores the two operations total ${fmt(shk+shv)} visits a week.`);
    o.evid=T(`A KC programa ${fmt(shk)} e a KV ${fmt(shv)}. A média por loja vai de ${sh?fmt2(shk/sh):'—'} (só KC) e ${sh?fmt2(shv/sh):'—'} (só KV) para ${sh?fmt2((shk+shv)/sh):'—'} somando as duas. No corte ${ctx} o total programado é de ${fmt(fkc)} visitas da KC e ${fmt(fkv)} da KV por semana.`,
             `KC schedules ${fmt(shk)} and KV ${fmt(shv)}. The average per store goes from ${sh?fmt2(shk/sh):'—'} (KC alone) and ${sh?fmt2(shv/sh):'—'} (KV alone) to ${sh?fmt2((shk+shv)/sh):'—'} counting both. In the ${ctx} cut the scheduled total is ${fmt(fkc)} KC visits and ${fmt(fkv)} KV visits a week.`);
    if(r.dim){
      const g=agrupar(idx,r.dim).filter(x=>x.sh>0).sort((a,b)=>(b.fkc+b.fkv)-(a.fkc+a.fkv)).slice(0,r.topn||10);
      o.tab={cols:[ROT[r.dim][lang==='en'?1:0],T('Compart.','Shared'),T('Visitas KC','KC visits'),T('Visitas KV','KV visits'),T('Combinada/loja','Combined/store')],
        linhas:g.map(x=>[x.k,fmt(x.sh),fmt(x.fkc),fmt(x.fkv),x.tot?fmt2((x.fkc+x.fkv)/x.tot):'—'])};
    }
    o.interp=T('Frequência combinada é soma aritmética de duas programações: mostra a presença que já existe no ponto de venda, não que um profissional execute as duas marcas.',
               'Combined frequency is the arithmetic sum of two schedules: it shows the presence already at the point of sale, not that one professional executes both brands.');
    return o;
  }
  if(r.metrica==='compartilhadas'){
    const dim=r.dim||'uf';
    const g=agrupar(idx,dim).filter(x=>x.tot>=10).sort((a,b)=>(b.sh/b.tot)-(a.sh/a.tot)).slice(0,r.topn||10);
    o.classe='comprovado';
    o.direta=T(`${g[0]?g[0].k:'—'} tem a maior sobreposição: ${g[0]?pct(100*g[0].sh/g[0].tot):'—'} das lojas recebem as duas operações.`,
               `${g[0]?g[0].k:'—'} has the highest overlap: ${g[0]?pct(100*g[0].sh/g[0].tot):'—'} of its stores receive both operations.`);
    o.evid=T(`No corte ${ctx} há ${fmt(tot)} lojas: ${fmt(sh)} compartilhadas (${tot?pct(100*sh/tot):'—'}), ${fmt(xkc)} só da KC e ${fmt(xkv)} só da KV.`,
             `In the ${ctx} cut there are ${fmt(tot)} stores: ${fmt(sh)} shared (${tot?pct(100*sh/tot):'—'}), ${fmt(xkc)} KC only and ${fmt(xkv)} KV only.`);
    o.tab={cols:[ROT[dim][lang==='en'?1:0],T('Universo','Universe'),T('Compart.','Shared'),T('% compart.','% shared'),T('Só KC','KC only'),T('Só KV','KV only')],
      linhas:g.map(x=>[x.k,fmt(x.tot),fmt(x.sh),pct(100*x.sh/x.tot),fmt(x.kc),fmt(x.kv)])};
    o.interp=T('Sobreposição alta significa que as duas equipes vão ao mesmo endereço.','High overlap means both teams go to the same address.');
    return o;
  }
  if(r.metrica==='contagem'){
    o.classe='comprovado';
    o.direta=T(
      `São ${fmt(tot)} lojas no total: ${fmt(ckc)} na KC e ${fmt(ckv)} na KV.`,
      `There are ${fmt(tot)} stores in total: ${fmt(ckc)} at KC and ${fmt(ckv)} at KV.`);
    o.evid=T(
      `No corte ${ctx}: ${fmt(sh)} lojas recebem as duas operações, ${fmt(xkc)} só a KC e ${fmt(xkv)} só a KV. `+
      `Juntas somam ${fmt(fkc+fkv)} visitas por semana — ${fmt(fkc)} da KC e ${fmt(fkv)} da KV.`,
      `In the ${ctx} cut: ${fmt(sh)} stores receive both operations, ${fmt(xkc)} only KC and ${fmt(xkv)} only KV. `+
      `Together they add up to ${fmt(fkc+fkv)} visits a week — ${fmt(fkc)} from KC and ${fmt(fkv)} from KV.`);
    if(r.dim){
      const g=agrupar(idx,r.dim).sort((a,b)=>b.tot-a.tot).slice(0,r.topn||12);
      o.tab={cols:[ROT[r.dim][lang==='en'?1:0],T('Total','Total'),T('Na KC','At KC'),
                   T('Na KV','At KV'),T('Compart.','Shared')],
        linhas:g.map(x=>[x.k,fmt(x.tot),fmt(x.sh+x.kc),fmt(x.sh+x.kv),fmt(x.sh)])};
    }
    o.interp = sh
      ? T(`${fmt(sh)} dessas lojas já são atendidas pelas duas: o mesmo CNPJ está nas duas bases.`,
          `${fmt(sh)} of these stores are already served by both: the same tax ID is in both bases.`)
      : T('Nenhuma dessas lojas é atendida pelas duas operações hoje.',
          'None of these stores is served by both operations today.');
    return o;
  }
  const kvg=r.metrica==='ganho_kv';
  const base=kvg?ckv:ckc, add=kvg?xkc:xkv, quem=kvg?'KV':'KC';
  o.classe='comprovado';
  o.direta=T(`A ${quem} passa a cobrir ${fmt(add)} lojas novas — ${base?'+'+pct(100*add/base):'—'} sobre a cobertura atual.`,
             `${quem} starts covering ${fmt(add)} new stores — ${base?'+'+pct(100*add/base):'—'} over current coverage.`);
  o.evid=T(`No corte ${ctx} o universo consolidado tem ${fmt(tot)} lojas. A ${quem} atende hoje ${fmt(base)} e a outra operação atende ${fmt(add)} que a ${quem} não alcança. As duas juntas chegam a ${fmt(tot)}.`,
           `In the ${ctx} cut the consolidated universe holds ${fmt(tot)} stores. ${quem} serves ${fmt(base)} today and the other operation serves ${fmt(add)} that ${quem} does not reach. Together they reach ${fmt(tot)}.`);
  const dim=r.dim||(Object.keys(r.filtros).length?null:'uf');
  if(dim){
    const g=agrupar(idx,dim).filter(x=>x.tot>=5).sort((a,b)=>(kvg?b.kc-a.kc:b.kv-a.kv)).slice(0,r.topn||10);
    o.barras={rot:ROT[dim][lang==='en'?1:0],itens:g.map(x=>({k:x.k,v:kvg?x.kc:x.kv}))};
  }
  o.interp=T('O alcance é a parte demonstrável: essas lojas existem, a outra operação as visita e esta não. Qual frequência dar a elas não está nos arquivos.',
             'Reach is the demonstrable part: those stores exist, the other operation visits them and this one does not. What frequency to give them is not in the files.');
  return o;
}
const SELO={comprovado:['Resultado comprovado','Proven result'],
  oportunidade:['Oportunidade identificada','Opportunity identified'],
  naocalc:['Não calculável','Not calculable']};
function render(o){
  ultima=o;
  const H=['<div class="resp">'];
  if(o.classe) H.push(`<span class="selo ${o.classe}" style="position:static;display:inline-flex;margin-bottom:14px">${SELO[o.classe][lang==='en'?1:0]}</span>`);
  H.push(`<h4>${T('Resposta direta','Direct answer')}</h4><p class="direta">${o.direta}</p>`);
  H.push(`<h4>${T('Evidência','Evidence')}</h4><p>${o.evid}</p>`);
  if(o.barras){
    const mx=Math.max(...o.barras.itens.map(i=>i.v),1);
    H.push(`<h4>${T('Visualização','Visualisation')} · ${o.barras.rot}</h4><div class="barras" style="--rot:150px;--val:74px">`);
    o.barras.itens.forEach(i=>H.push(`<div class="ln"><span class="rot" title="${i.k}">${i.k}</span><span class="tr"><i class="kc" style="--w:${(100*i.v/mx).toFixed(1)}%"></i></span><span class="val">${fmt(i.v)}</span></div>`));
    H.push('</div>');
  }
  if(o.tab) H.push(`<h4>${T('Visualização','Visualisation')}</h4><table class="tab"><thead><tr>`+
    o.tab.cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>'+
    o.tab.linhas.map(l=>'<tr>'+l.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</tbody></table>');
  H.push(`<h4>${T('Interpretação','Interpretation')}</h4><p>${o.interp}</p>`);
  H.push(`<h4>${T('Rastreabilidade','Traceability')}</h4><p class="rastro">`+
    `${T('Pergunta','Question')}: ${o.pergunta}<br>${T('Filtros','Filters')}: ${o.rastro.filtros}<br>`+
    `${T('Linhas consideradas','Rows considered')}: ${fmt(o.rastro.linhas)} ${T('de','of')} ${fmt(N)}<br>`+
    `${T('Fonte','Source')}: ${T('master de lojas, conciliado por CNPJ','store master, matched by tax ID')}</p>`);
  H.push(`<div class="acoes"><button class="botao mini" id="ia-copiar">${T('Copiar','Copy')}</button>`+
    `<button class="botao mini" id="ia-csv">${T('Exportar Excel','Export Excel')}</button>`+
    `<button class="botao mini" id="ia-volta">${T('Voltar aos arquivos','Back to files')}</button></div></div>`);
  const s=$('#ia-saida'); s.dataset.arquivos=s.dataset.arquivos||s.innerHTML;
  s.innerHTML=H.join(''); s.scrollTop=0;
  $('#ia-copiar').addEventListener('click',e=>{navigator.clipboard.writeText(s.innerText).then(()=>{
    e.target.textContent=T('Copiado','Copied');setTimeout(()=>e.target.textContent=T('Copiar','Copy'),1500);});});
  $('#ia-csv').addEventListener('click',()=>{
    const limpo=x=>String(x).replace(/<[^>]+>/g,'');
    let linhas;
    if(o.tab) linhas=[o.tab.cols].concat(o.tab.linhas.map(l=>l.map(limpo)));
    else if(o.barras) linhas=[[o.barras.rot,'Valor']].concat(o.barras.itens.map(i=>[i.k,i.v]));
    else linhas=[['Resposta'],[limpo(o.direta)]];
    salvarXLSX([{nome:'Resposta', nota:limpo(o.pergunta)+' · '+o.rastro.filtros,
      linhas:linhas}], 'resposta.xlsx');});
  $('#ia-volta').addEventListener('click',()=>{s.innerHTML=s.dataset.arquivos;ultima=null;});
}
async function perguntar(p){
  if(!p||!p.trim()) return;
  const pr=$('#ia-proc'); pr.hidden=false;
  const chave=iaChave();
  try{
    if(chave){
      try{
        const r=await iaPerguntar(p, chave);
        iaRender(r, p);
        return;
      }catch(err){
        const s=$('#ia-saida');
        s.dataset.arquivos=s.dataset.arquivos||s.innerHTML;
        s.innerHTML='<div class="resp"><span class="selo naocalc" style="position:static;'+
          'display:inline-flex;margin-bottom:14px">'+T('IA indisponível','AI unavailable')+'</span>'+
          '<h4>'+T('O modelo não respondeu','The model did not respond')+'</h4><p>'+
          String(err.message||err)+'</p><p class="rastro" style="margin-top:12px">'+
          T('A resposta abaixo foi calculada sem o modelo, pelo motor determinístico.',
            'The answer below was computed without the model, by the deterministic engine.')+
          '</p></div>';
        const o=responder(p);
        contexto={filtros:o.r?o.r.filtros:{},dim:o.r?o.r.dim:null,metrica:o.r?o.r.metrica:null};
        const antes=s.innerHTML; render(o); s.innerHTML=antes+s.innerHTML;
        return;
      }
    }
    const o=responder(p);
    contexto={filtros:o.r?o.r.filtros:{},dim:o.r?o.r.dim:null,metrica:o.r?o.r.metrica:null};
    render(o);
  } finally { pr.hidden=true; }
}
const go=$('#ia-go'); if(go) go.addEventListener('click',()=>perguntar($('#ia-q').value));
const ta=$('#ia-q');
if(ta) ta.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='Enter') perguntar(ta.value); });
$$('.s-ia .sug button').forEach(b=>b.addEventListener('click',()=>{ta.value=b.dataset.q;perguntar(b.dataset.q);}));
const lim=$('#ia-limpar');
if(lim) lim.addEventListener('click',()=>{ta.value='';contexto={};
  const s=$('#ia-saida'); if(s.dataset.arquivos){s.innerHTML=s.dataset.arquivos;ultima=null;}});
dizEstado();

/* ---------------------------------------------------------------- arranque */
const h=parseInt(location.hash.slice(1),10);
const n0=isNaN(h)?0:Math.max(0,Math.min(total-1,h-1));
telas.forEach(t=>t.classList.remove('ativa'));
atual=n0===0?1:0; aplicar(n0);
})();
