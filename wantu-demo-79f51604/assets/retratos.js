/* WANTU · retratos
   Retrato abstrato determinístico, gerado do seed do creator. Sem rosto, sem
   corpo, sem silhueta, sem recurso remoto e sem geração por IA. O brandbook
   pede padrão abstrato na demonstração, e nunca foto de pessoa capturada de
   rede social. Não conhece DOM: devolve string de SVG.                     */

;(function (raiz) {
  'use strict';

  const TINTAS = ['#BA9CFF', '#F19ACB', '#D1FF80', '#8C7BD6', '#E07FB0'];
  const FUNDOS = ['#201C29', '#15131D', '#241E33', '#1A1726'];

  function hash(seed) {
    let h = 2166136261;
    const s = String(seed == null || seed === '' ? 'wantu' : seed);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32: pequeno, determinístico, suficiente para arte abstrata */
  function gerador(semente) {
    let a = semente;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function estrela(cx, cy, r, cor, opacidade) {
    const pontas = 8;
    const partes = [];
    for (let i = 0; i < pontas * 2; i += 1) {
      const raio = i % 2 === 0 ? r : r * 0.38;
      const ang = (Math.PI / pontas) * i - Math.PI / 2;
      partes.push((cx + raio * Math.cos(ang)).toFixed(1) + ',' + (cy + raio * Math.sin(ang)).toFixed(1));
    }
    return '<path d="M' + partes.join(' L') + ' Z" fill="' + cor + '" opacity="' + opacidade + '"/>';
  }

  function svg(seed) {
    const h = hash(seed);
    const r = gerador(h);
    const id = 'g' + h.toString(36);
    const fundo = FUNDOS[h % FUNDOS.length];
    const a = TINTAS[Math.floor(r() * TINTAS.length)];
    const b = TINTAS[Math.floor(r() * TINTAS.length)];
    const ang = Math.floor(r() * 180);

    const partes = [];
    partes.push('<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">');
    partes.push('<defs>');
    partes.push('<linearGradient id="' + id + 'a" gradientTransform="rotate(' + ang + ' .5 .5)">'
      + '<stop offset="0%" stop-color="' + a + '" stop-opacity="0.92"/>'
      + '<stop offset="100%" stop-color="' + b + '" stop-opacity="0.28"/></linearGradient>');
    partes.push('<linearGradient id="' + id + 'b" x1="0" y1="1" x2="1" y2="0">'
      + '<stop offset="0%" stop-color="' + fundo + '" stop-opacity="0"/>'
      + '<stop offset="100%" stop-color="' + fundo + '" stop-opacity="0.88"/></linearGradient>');
    partes.push('</defs>');

    partes.push('<rect width="400" height="500" fill="' + fundo + '"/>');

    /* Massa principal, sempre fora do centro, para o enquadramento ter autoria */
    const cx = 110 + Math.floor(r() * 180);
    const cy = 150 + Math.floor(r() * 200);
    partes.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (150 + Math.floor(r() * 90)) + '" fill="url(#' + id + 'a)"/>');

    /* Formas de apoio */
    const formas = 2 + Math.floor(r() * 3);
    for (let i = 0; i < formas; i += 1) {
      const tipo = r();
      const op = (0.1 + r() * 0.26).toFixed(2);
      const tinta = TINTAS[Math.floor(r() * TINTAS.length)];
      if (tipo < 0.4) {
        partes.push('<circle cx="' + Math.floor(r() * 400) + '" cy="' + Math.floor(r() * 500) + '" r="'
          + (36 + Math.floor(r() * 110)) + '" fill="' + tinta + '" opacity="' + op + '"/>');
      } else if (tipo < 0.75) {
        const rot = Math.floor(r() * 90) - 45;
        partes.push('<rect x="' + Math.floor(r() * 300) + '" y="' + Math.floor(r() * 400) + '" width="'
          + (70 + Math.floor(r() * 170)) + '" height="' + (70 + Math.floor(r() * 220)) + '" rx="28" fill="' + tinta
          + '" opacity="' + op + '" transform="rotate(' + rot + ' 200 250)"/>');
      } else {
        /* Linha orbital: encontro, não perseguição */
        partes.push('<ellipse cx="' + (120 + Math.floor(r() * 160)) + '" cy="' + (140 + Math.floor(r() * 220))
          + '" rx="' + (90 + Math.floor(r() * 120)) + '" ry="' + (34 + Math.floor(r() * 70)) + '" fill="none" stroke="'
          + tinta + '" stroke-width="1.5" opacity="' + op + '" transform="rotate(' + (Math.floor(r() * 120) - 60) + ' 200 250)"/>');
      }
    }

    /* A estrela de oito pontas aparece no máximo uma vez, com parcimônia */
    if (r() > 0.45) {
      partes.push(estrela(44 + Math.floor(r() * 312), 44 + Math.floor(r() * 412), 12 + Math.floor(r() * 12), '#D1FF80', (0.3 + r() * 0.4).toFixed(2)));
    }

    /* Véu inferior, para o pseudônimo ter contraste quando sobreposto */
    partes.push('<rect width="400" height="500" fill="url(#' + id + 'b)"/>');
    partes.push('</svg>');
    return partes.join('');
  }

  function dataUri(seed) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg(seed));
  }

  const api = { svg: svg, dataUri: dataUri, hash: hash };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.retratos = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
