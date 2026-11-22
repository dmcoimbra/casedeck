/* ============================================================================
   EXPORTAÇÃO PARA POWERPOINT — elementos soltos e editáveis
   ----------------------------------------------------------------------------
   Nada de imagem da tela. Cada coisa vira o objeto nativo correspondente:
   texto é caixa de texto, tabela é tabela do PowerPoint, barra é gráfico com a
   série de dados dentro, e o mapa e o diagrama de intersecção saem em SVG, que
   o PowerPoint converte em formas com dois cliques.

   Posição: o palco tem 1600x900 e o slide tem 13,333 x 7,5 polegadas. Isso dá
   exatamente 120 px por polegada, então a medida que o elemento tem na tela é a
   medida que ele tem no arquivo. Tamanho de fonte: 120 px = 72 pt, logo pt = px * 0,6.
   ========================================================================== */
(function(){
'use strict';

const PX_POL = 120;
const PT_PX  = 0.6;
const pol = v => +(v / PX_POL).toFixed(3);
const pt  = v => Math.max(6, +(v * PT_PX).toFixed(1));

/* ---------------------------------------------------------------- utilidades */
function hex(cor){
  if(!cor) return null;
  const m = String(cor).match(/rgba?\(([^)]+)\)/);
  if(!m) return null;
  const p = m[1].split(',').map(x=>parseFloat(x.trim()));
  if(p.length > 3 && p[3] === 0) return null;            // transparente
  return p.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function familia(ff){
  const f = (ff||'').split(',')[0].replace(/["']/g,'').trim();
  return f || 'Inter';
}
function alinhamento(ta){
  if(ta === 'right' || ta === 'end') return 'right';
  if(ta === 'center') return 'center';
  return 'left';
}
/** Retângulo do elemento em px do palco, relativo à lâmina. */
function caixa(el, base, k){
  const b = el.getBoundingClientRect();
  return { x:(b.left-base.left)*k, y:(b.top-base.top)*k,
           w:b.width*k, h:b.height*k };
}
/** Um elemento rolado para fora do container não aparece — e não vai para o arquivo. */
function recortado(el, base, k){
  let r = el.getBoundingClientRect(), p = el.parentElement;
  while(p && p.id !== 'wrap'){
    const st = getComputedStyle(p);
    if(/auto|scroll|hidden/.test(st.overflow + st.overflowY + st.overflowX)){
      const c = p.getBoundingClientRect();
      if(r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return true;
      if(r.right  <= c.left + 1 || r.left >= c.right  - 1) return true;
    }
    p = p.parentElement;
  }
  return false;
}
function visivel(el){
  const s = getComputedStyle(el);
  if(s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
  const b = el.getBoundingClientRect();
  return b.width > 0.5 && b.height > 0.5;
}

/* ------------------------------------------------------------------ o mapa
   Leaflet desenha com tiles e canvas; nada disso vira forma editável. Aqui o
   contorno dos estados e os pontos são redesenhados em SVG, do mesmo dado que
   a tela usa. Projeção equiretangular com correção de latitude — suficiente
   para o Brasil e igual ao que a tela mostra. */
function svgDoMapa(larg, alt){
  if(!window.MALHA_UF) return null;
  const LAT = [-34.0, 5.5], LON = [-74.2, -34.6];
  const cosm = Math.cos((LAT[0]+LAT[1])/2 * Math.PI/180);
  const lw = (LON[1]-LON[0]) * cosm, lh = LAT[1]-LAT[0];
  const esc = Math.min(larg/lw, alt/lh) * 0.96;
  const ox = (larg - lw*esc)/2, oy = (alt - lh*esc)/2;
  const X = lon => ox + (lon - LON[0]) * cosm * esc;
  const Y = lat => oy + (LAT[1] - lat) * esc;

  let d = '';
  for(const f of window.MALHA_UF.features){
    const g = f.geometry, aneis = [];
    (function colher(o){
      if(Array.isArray(o) && o.length && Array.isArray(o[0]) && typeof o[0][0] === 'number'){ aneis.push(o); return; }
      if(Array.isArray(o)) o.forEach(x=>{ if(Array.isArray(x)) colher(x); });
    })(g.coordinates);
    for(const a of aneis){
      d += 'M' + a.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join('L') + 'Z';
    }
  }
  // os pontos saem do mesmo agrupamento que a tela usa
  const pontos = (window.__MAPA_PONTOS__ || []).map(m=>{
    const cor = (m.kc+m.sh>0 && m.kv+m.sh>0) ? '#1E7FB4' : (m.kc+m.sh>0 ? '#0046C8' : '#00B388');
    return `<circle cx="${X(m.lon).toFixed(1)}" cy="${Y(m.lat).toFixed(1)}" r="${m.r.toFixed(1)}" `+
           `fill="${cor}" fill-opacity=".45" stroke="${cor}" stroke-width="1.1"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${larg}" height="${alt}" viewBox="0 0 ${larg} ${alt}">`+
         `<rect width="${larg}" height="${alt}" fill="#F7F9FB"/>`+
         `<path d="${d}" fill="#EEF1F5" stroke="#C3CAD6" stroke-width="1" stroke-linejoin="round"/>`+
         pontos + '</svg>';
}

function svgLimpo(el, larg, alt){
  const c = el.cloneNode(true);
  c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if(!c.getAttribute('viewBox')) c.setAttribute('viewBox', `0 0 ${larg} ${alt}`);
  c.setAttribute('width', larg); c.setAttribute('height', alt);
  // cor herdada por CSS não viaja no SVG solto: fixa o que estiver computado
  const orig = el.querySelectorAll('*'), copia = c.querySelectorAll('*');
  for(let i=0;i<orig.length;i++){
    const s = getComputedStyle(orig[i]);
    const f = s.fill, k = s.stroke;
    if(f && f !== 'none') copia[i].setAttribute('fill', f);
    if(k && k !== 'none') copia[i].setAttribute('stroke', k);
    if(s.fillOpacity && s.fillOpacity !== '1') copia[i].setAttribute('fill-opacity', s.fillOpacity);
    if(s.fontSize) copia[i].setAttribute('font-size', s.fontSize);
    if(s.fontFamily) copia[i].setAttribute('font-family', familia(s.fontFamily));
    if(s.fontWeight) copia[i].setAttribute('font-weight', s.fontWeight);
  }
  return new XMLSerializer().serializeToString(c);
}
const comoURI = svg => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

/* ------------------------------------------------------- blocos reconhecidos */
function ehBarras(el){ return el.classList && el.classList.contains('barras'); }
function ehTabela(el){ return el.tagName === 'TABLE'; }
function ehKpi(el){ return el.classList && el.classList.contains('kpi'); }
function ehSvg(el){ return el.tagName === 'svg'; }
function ehMapa(el){ return el.id === 'mapaBR'; }

/** Barras viram gráfico nativo: a série vai junto, o cliente edita no PowerPoint. */
function porBarras(slide, el, base, k, P){
  const c = caixa(el, base, k);
  const dupla = el.classList.contains('dupla');
  const linhas = [...el.querySelectorAll('.ln')];
  if(!linhas.length) return;
  const rotulos = linhas.map(l=>(l.querySelector('.rot')||{}).textContent?.trim() || '');
  const lerVal = txt => {
    const n = String(txt||'').replace(/\./g,'').replace(',','.').match(/-?\d+(\.\d+)?/);
    return n ? parseFloat(n[0]) : 0;
  };
  let series;
  if(dupla){
    const part = linhas.map(l=>String((l.querySelector('.val')||{}).textContent||'').split('·'));
    series = [{ name:'KC', labels:rotulos, values:part.map(p=>lerVal(p[0])) },
              { name:'KV', labels:rotulos, values:part.map(p=>lerVal(p[1])) }];
  } else {
    const kv = el.querySelector('.tr i.kv');
    series = [{ name: kv ? 'KV' : 'KC', labels:rotulos,
                values: linhas.map(l=>lerVal((l.querySelector('.val')||{}).textContent)) }];
  }
  slide.addChart(P.ChartType.bar, series, {
    x:pol(c.x), y:pol(c.y), w:pol(c.w), h:pol(c.h),
    barDir:'bar', barGrouping:'clustered',
    chartColors: dupla ? ['0046C8','00B388'] : [el.querySelector('.tr i.kv') ? '00B388' : '0046C8'],
    showLegend:dupla, legendPos:'b', legendFontSize:8,
    showValue:true, dataLabelFontSize:8, dataLabelFontFace:'IBM Plex Mono',
    catAxisLabelFontSize:8.5, valAxisHidden:true,
    catAxisLineShow:false, valAxisLineShow:false,
    showTitle:false, border:{pt:0, color:'FFFFFF'}, fill:'FFFFFF'
  });
}

/** Tabela do HTML vira tabela do PowerPoint, com cabeçalho e tudo editável. */
function porTabela(slide, el, base, k){
  const c = caixa(el, base, k);
  const cab = [...el.querySelectorAll('thead th')].map(t=>t.textContent.trim());
  const corpo = [...el.querySelectorAll('tbody tr')]
    .filter(tr => !recortado(tr, base, k))
    .map(tr => [...tr.children].map(td => td.textContent.trim().replace(/\s+/g,' ')));
  if(!corpo.length) return;
  const linhas = [];
  if(cab.length) linhas.push(cab.map(t=>({ text:t,
    options:{ bold:true, color:'5A6070', fontSize:8.5, fontFace:'IBM Plex Mono',
              fill:'F4F6F9', valign:'middle' } })));
  corpo.forEach(r => linhas.push(r.map((t,i)=>({ text:t,
    options:{ fontSize:9, fontFace:i===0?'Inter':'IBM Plex Mono',
              color:'111111', align:i===0?'left':'right', valign:'middle' } }))));
  slide.addTable(linhas, {
    x:pol(c.x), y:pol(c.y), w:pol(c.w),
    border:{ type:'solid', pt:0.5, color:'E6E9EF' },
    autoPage:false, fontSize:9
  });
}

/** Cartão de número: retângulo + rótulo + valor, três objetos soltos. */
function porKpi(slide, el, base, k){
  const c = caixa(el, base, k);
  const s = getComputedStyle(el);
  slide.addShape('roundRect', {
    x:pol(c.x), y:pol(c.y), w:pol(c.w), h:pol(c.h),
    fill:{ color: hex(s.backgroundColor) || 'FFFFFF' },
    line:{ color: hex(s.borderTopColor) || 'E6E9EF', width:0.75 },
    rectRadius:0.03
  });
  [...el.children].forEach(ch=>{
    if(!visivel(ch)) return;
    const t = ch.textContent.trim(); if(!t) return;
    const cc = caixa(ch, base, k), cs = getComputedStyle(ch);
    slide.addText(t, {
      x:pol(cc.x), y:pol(cc.y), w:pol(cc.w), h:pol(cc.h),
      fontSize:pt(parseFloat(cs.fontSize)), fontFace:familia(cs.fontFamily),
      color:hex(cs.color) || '111111',
      bold:(+cs.fontWeight >= 600), align:alinhamento(cs.textAlign),
      valign:'middle', margin:0, isTextBox:true
    });
  });
}

/* ------------------------------------------------------------ texto genérico */
function porTexto(slide, el, base, k){
  const t = el.textContent.replace(/\s+/g,' ').trim();
  if(!t) return;
  const c = caixa(el, base, k), s = getComputedStyle(el);
  const tam = parseFloat(s.fontSize) || 16;
  slide.addText(t, {
    x:pol(c.x - 2), y:pol(c.y - 1), w:pol(c.w + 8), h:pol(c.h + 3),
    fontSize:pt(tam), fontFace:familia(s.fontFamily),
    color:hex(s.color) || '111111',
    bold:(+s.fontWeight >= 600),
    italic:(s.fontStyle === 'italic'),
    charSpacing: parseFloat(s.letterSpacing) > 0.3 ? 1 : 0,
    align:alinhamento(s.textAlign), valign:'top', margin:0,
    lineSpacingMultiple: Math.min(2, (parseFloat(s.lineHeight)||tam*1.3) / tam),
    isTextBox:true, wrap:true
  });
}

/* ------------------------------------------------------------- uma lâmina */
function porLamina(pptx, sec, k){
  const slide = pptx.addSlide();
  slide.background = { color:'FFFFFF' };
  const base = sec.getBoundingClientRect();

  (function anda(el){
    for(const ch of el.children){
      if(!visivel(ch) || recortado(ch, base, k)) continue;
      if(ch.classList && (ch.classList.contains('abas') ||
         ch.classList.contains('filtros') || ch.classList.contains('exportar') ||
         ch.tagName === 'SELECT' || ch.tagName === 'BUTTON' || ch.tagName === 'INPUT')) continue;

      const c = caixa(ch, base, k);
      if(ehMapa(ch)){
        const svg = svgDoMapa(Math.round(c.w), Math.round(c.h));
        if(svg) slide.addImage({ data:comoURI(svg), x:pol(c.x), y:pol(c.y), w:pol(c.w), h:pol(c.h) });
        continue;
      }
      if(ehSvg(ch)){
        slide.addImage({ data:comoURI(svgLimpo(ch, Math.round(c.w), Math.round(c.h))),
                         x:pol(c.x), y:pol(c.y), w:pol(c.w), h:pol(c.h) });
        continue;
      }
      if(ehBarras(ch)){ porBarras(slide, ch, base, k, pptx); continue; }
      if(ehTabela(ch)){ porTabela(slide, ch, base, k); continue; }
      if(ehKpi(ch)){ porKpi(slide, ch, base, k); continue; }

      // caixa com fundo ou borda própria vira retângulo, e o conteúdo segue dentro
      const s = getComputedStyle(ch);
      const fundo = hex(s.backgroundColor);
      const borda = (parseFloat(s.borderTopWidth) > 0) ? hex(s.borderTopColor) : null;
      if((fundo && fundo !== 'FFFFFF') || borda){
        slide.addShape('roundRect', {
          x:pol(c.x), y:pol(c.y), w:pol(c.w), h:pol(c.h),
          fill: fundo ? { color:fundo } : { type:'none' },
          line: borda ? { color:borda, width:0.75 } : { type:'none' },
          rectRadius:0.03
        });
      }
      if(!ch.children.length) porTexto(slide, ch, base, k);
      else anda(ch);
    }
  })(sec);
  return slide;
}

/* ------------------------------------------------------------------ entrada */
async function gerarPPTX(aviso){
  if(typeof PptxGenJS === 'undefined') throw new Error('biblioteca de PowerPoint não carregou');
  const wrap = document.getElementById('wrap');
  const secs = [...wrap.querySelectorAll('section')];
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name:'PALCO', width:13.333, height:7.5 });
  pptx.layout = 'PALCO';
  pptx.author = 'Estudo de sinergia de campo';
  pptx.title  = document.title;

  const antes = secs.map(s=>s.className);
  const escala = wrap.getBoundingClientRect().width / 1600;   // do palco para a tela
  const k = 1/escala;

  // A animação de entrada começa em opacity:0 e com transform. Forçando a
  // lâmina por fora da navegação, ela não roda — e sem isto os elementos
  // animados seriam lidos como invisíveis, ou medidos na posição deslocada.
  const trava = document.createElement('style');
  trava.textContent =
    '#wrap .ent-sobe,#wrap .ent-sobe *{animation:none!important;transition:none!important;'+
    'opacity:1!important;transform:none!important;visibility:visible!important}'+
    '#wrap .tela.exportando{visibility:visible!important;opacity:1!important}';
  document.head.appendChild(trava);

  for(let i=0;i<secs.length;i++){
    if(aviso) aviso(i+1, secs.length);
    // a lâmina visível é .tela.ativa; 'exportando' a mostra sem disparar a animação
    secs.forEach(s=>s.classList.remove('exportando'));
    secs[i].classList.add('exportando');
    // deixa o navegador terminar o layout antes de medir
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    porLamina(pptx, secs[i], k);
  }
  secs.forEach((s,i)=>{ s.className = antes[i]; });
  trava.remove();

  await pptx.writeFile({ fileName:'estudo-sinergia-de-campo.pptx' });
  return secs.length;
}
window.__GERAR_PPTX__ = gerarPPTX;
})();
