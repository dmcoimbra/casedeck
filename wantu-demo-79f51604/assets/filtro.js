/* WANTU · filtro
   Catálogo público: projeção e filtros. Devolve SÓ o que o creator consentiu
   expor, nunca o objeto interno. A lista de bloqueados, o limite diário e o
   estado de verificação ficam de fora por decisão, não por esquecimento.

   Não ordena por preço, nota, popularidade nem nada que se pareça com
   ranking de pessoas: a ordem é a do catálogo.
   Não conhece DOM nem armazenamento.                                       */

;(function (raiz) {
  'use strict';

  function semAcento(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /* Projeção pública: a lista de campos é explícita, então um campo novo no
     modelo interno não vaza para o catálogo sem alguém decidir que vaza. */
  function publico(c) {
    const minimos = c.categorias.map(function (x) { return x.minimoCentavos; });
    const prazos = c.categorias.map(function (x) { return x.prazoDias; });
    return {
      publicId: c.publicId,
      pseudonimo: c.pseudonimo,
      tagline: c.tagline,
      bio: c.bio,
      estilos: c.estilos.slice(),
      categorias: c.categorias.map(function (x) {
        return { id: x.id, minimoCentavos: x.minimoCentavos, prazoDias: x.prazoDias };
      }),
      naoAceito: c.naoAceito.slice(),
      disponibilidade: c.disponibilidade,
      optIn: { versao: c.optIn.versao, em: c.optIn.em },
      respostaMediaHoras: c.respostaMediaHoras,
      retratoSeed: c.retratoSeed,
      minimoCentavos: minimos.length ? Math.min.apply(null, minimos) : 0,
      prazoMinDias: prazos.length ? Math.min.apply(null, prazos) : 0,
    };
  }

  function aplicar(creators, criterios) {
    const c = criterios || {};
    const busca = c.busca ? semAcento(c.busca) : null;

    return (creators || []).map(publico).filter(function (p) {
      if (c.modalidade && !p.categorias.some(function (x) { return x.id === c.modalidade; })) return false;
      if (c.disponibilidade && p.disponibilidade !== c.disponibilidade) return false;

      /* Quando há modalidade escolhida, a faixa de preço vale para ELA, e não
         para o mínimo geral do creator. Comparar com o mínimo geral mostraria
         alguém que cobra pouco em foto como opção barata de vídeo. */
      const alvo = c.modalidade
        ? p.categorias.find(function (x) { return x.id === c.modalidade; })
        : { minimoCentavos: p.minimoCentavos, prazoDias: p.prazoMinDias };

      if (c.precoMax != null && alvo.minimoCentavos > c.precoMax) return false;
      if (c.precoMin != null && alvo.minimoCentavos < c.precoMin) return false;

      const prazo = c.modalidade ? alvo.prazoDias : p.prazoMinDias;
      if (c.prazoMaxDias != null && prazo > c.prazoMaxDias) return false;

      if (busca) {
        const campo = semAcento([p.pseudonimo, p.tagline, p.bio, p.estilos.join(' ')].join(' '));
        if (campo.indexOf(busca) === -1) return false;
      }

      return true;
    });
  }

  /* As opções do formulário saem do próprio catálogo, para o filtro nunca
     oferecer algo que ninguém habilitou */
  function opcoes(creators, categorias) {
    const publicos = (creators || []).map(publico);
    const habilitadas = new Set();
    let min = Infinity;
    let max = 0;
    let prazoMin = Infinity;
    let prazoMax = 0;

    for (const p of publicos) {
      for (const cat of p.categorias) {
        habilitadas.add(cat.id);
        min = Math.min(min, cat.minimoCentavos);
        max = Math.max(max, cat.minimoCentavos);
        prazoMin = Math.min(prazoMin, cat.prazoDias);
        prazoMax = Math.max(prazoMax, cat.prazoDias);
      }
    }

    return {
      modalidades: (categorias || []).filter(function (g) { return habilitadas.has(g.id); }),
      faixaPreco: { min: min === Infinity ? 0 : min, max: max },
      prazoMin: prazoMin === Infinity ? 0 : prazoMin,
      prazoMax: prazoMax,
    };
  }

  const api = { publico: publico, aplicar: aplicar, opcoes: opcoes, semAcento: semAcento };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.filtro = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
