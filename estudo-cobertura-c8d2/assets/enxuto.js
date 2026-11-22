/* ===========================================================================
   Entrega enxuta — navegação, idioma e exportação.
   Cinco lâminas estáticas: os números já estão no HTML, calculados no pipeline.
   Nada aqui recalcula nada; se um número mudar, ele muda na origem.
   ========================================================================= */
(function(){
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const palco = $('#palco');
const telas = $$('.tela');
let atual = 0, lang = 'pt';

/* ----------------------------------------------------- palco 1600x900 */
function ajustar(){
  palco.style.transform = 'scale(' + Math.min(innerWidth/1600, innerHeight/900) + ')';
}
addEventListener('resize', ajustar);
ajustar();

/* ------------------------------------------------------------ idioma */
// Cada elemento traduzível guarda o original em data-pt na primeira troca,
// para o caminho de volta não depender de reconstruir texto.
function idioma(l){
  lang = l;
  document.documentElement.lang = (l === 'en' ? 'en' : 'pt-BR');
  $$('[data-en]').forEach(e => {
    if(!e.hasAttribute('data-pt')) e.setAttribute('data-pt', e.innerHTML);
    e.innerHTML = (l === 'en' ? e.getAttribute('data-en') : e.getAttribute('data-pt'));
  });
  $('#lang-pt').classList.toggle('on', l === 'pt');
  $('#lang-en').classList.toggle('on', l === 'en');
}
$('#lang-pt').addEventListener('click', () => idioma('pt'));
$('#lang-en').addEventListener('click', () => idioma('en'));

/* -------------------------------------------------------- navegação */
function ir(i){
  atual = Math.max(0, Math.min(telas.length - 1, i));
  telas.forEach((t, k) => t.classList.toggle('ativa', k === atual));
  $('#pag').textContent = String(atual+1).padStart(2,'0') + ' / ' +
                          String(telas.length).padStart(2,'0');
  $('#ant').disabled  = (atual === 0);
  $('#prox').disabled = (atual === telas.length - 1);
  if (location.hash !== '#' + (atual+1)) history.replaceState(null, '', '#' + (atual+1));
}
$('#ant').addEventListener('click',  () => ir(atual-1));
$('#prox').addEventListener('click', () => ir(atual+1));

// Só seta do teclado e os botões. Nada de espaço nem clique no corpo: num
// material com campo de texto e botão, clique em qualquer lugar vira armadilha.
const EDITAVEL = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
                              el.tagName === 'SELECT' || el.isContentEditable);
addEventListener('keydown', e => {
  if (EDITAVEL(e.target)) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); ir(atual+1); }
  if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); ir(atual-1); }
  if (e.key === 'Home') { e.preventDefault(); ir(0); }
  if (e.key === 'End')  { e.preventDefault(); ir(telas.length-1); }
});

const doHash = () => {
  const n = parseInt((location.hash||'').replace('#',''), 10);
  ir(Number.isFinite(n) && n >= 1 ? n-1 : 0);
};
addEventListener('hashchange', doHash);
doHash();

/* ------------------------------------------- exportar em PowerPoint */
// T() existe no estudo completo; aqui o exportador também a usa.
window.T = (pt, en) => (lang === 'en' ? en : pt);
window.fmt = v => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));

(function(){
  const b = $('#baixar-pptx'); if(!b) return;
  const nota = $('#pptx-nota');
  const orig = nota ? nota.innerHTML : '';
  b.addEventListener('click', async () => {
    if (b.disabled) return;
    const rot = b.innerHTML;
    b.disabled = true;
    try {
      const n = await window.__GERAR_PPTX__((i,t) => {
        b.textContent = window.T('Montando ','Building ') + i + '/' + t;
      });
      b.textContent = window.T('Pronto · ','Done · ') + n + window.T(' lâminas',' slides');
    } catch(e) {
      b.textContent = window.T('Falhou','Failed');
      if (nota) nota.textContent = window.T('Não foi possível gerar: ','Could not build: ') + (e.message||e);
    }
    setTimeout(() => { b.disabled = false; b.innerHTML = rot;
                       if (nota) nota.innerHTML = orig; }, 3600);
  });
})();
})();
