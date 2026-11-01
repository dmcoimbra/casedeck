/* WANTU · moderação
   Fila de Trust and Safety: ordem por risco, decisão que exige justificativa
   escrita, e trilha de auditoria.

   Caso crítico não fecha com um revisor só, e o mesmo revisor não conta como
   a segunda revisão. O classificador sinaliza; quem decide é uma pessoa.

   Não conhece DOM nem armazenamento.                                       */

;(function (raiz) {
  'use strict';

  const JUSTIFICATIVA_MIN = 30;
  const PESO = { critico: 0, alto: 1, medio: 2, baixo: 3 };

  const DECISOES = [
    { id: 'ARQUIVAR', rotulo: 'Arquivar sem efeito',
      explicacao: 'O sinal foi verificado e não se confirma. Nada muda para as partes, e o registro fica na trilha.' },
    { id: 'ORIENTAR', rotulo: 'Orientar quem propôs',
      explicacao: 'Infração leve: a pessoa recebe uma orientação sobre a regra, sem restrição de função.' },
    { id: 'LIMITAR', rotulo: 'Limitar função temporariamente',
      explicacao: 'Restrição proporcional e reversível, com direito a recurso. Nunca aplicada por classificador sozinho.' },
    { id: 'ESCALAR', rotulo: 'Escalar para o plantão humano',
      explicacao: 'Risco grave. Isolamento preventivo proporcional e acionamento imediato de quem está de plantão.' },
  ];

  function fila(casos) {
    const abertos = [];
    const fechados = [];
    for (const c of casos || []) {
      (c.estado === 'RESOLVIDO' ? fechados : abertos).push(c);
    }
    const porRisco = function (a, b) {
      const d = (PESO[a.risco] === undefined ? 9 : PESO[a.risco]) - (PESO[b.risco] === undefined ? 9 : PESO[b.risco]);
      return d;
    };
    return abertos.sort(porRisco).concat(fechados.sort(porRisco));
  }

  function erro(codigo, mensagem) {
    return { ok: false, caso: null, erro: { codigo: codigo, mensagem: mensagem } };
  }

  function revisoresDe(caso) {
    return (caso.trilha || [])
      .filter(function (t) { return t.decisao; })
      .map(function (t) { return t.ator; });
  }

  function decidir(caso, dados, contexto) {
    if (contexto.papel !== 'MODERACAO') {
      return erro('NAO_AUTORIZADO', 'Somente a equipe de moderação decide sobre um caso, e cada acesso fica registrado.');
    }

    /* Caso fechado não se redecide por aqui: reabrir é outro ato, com outro
       registro. Sem esta guarda a concordância exigida abaixo podia ser
       desfeita depois, por uma pessoa só. */
    if (caso.estado === 'RESOLVIDO') {
      return erro('CASO_RESOLVIDO', 'Este caso já foi decidido. Reabrir é um ato à parte, com registro próprio.');
    }

    const decisao = dados && dados.decisao;
    if (!DECISOES.some(function (d) { return d.id === decisao; })) {
      return erro('DECISAO_INVALIDA', 'Escolha uma das decisões previstas na política.');
    }

    const justificativa = String((dados && dados.justificativa) || '').trim();
    if (!justificativa) {
      return erro('SEM_JUSTIFICATIVA', 'Toda decisão precisa de justificativa escrita, porque ela vai para a trilha e sustenta um eventual recurso.');
    }
    if (justificativa.length < JUSTIFICATIVA_MIN) {
      return erro('JUSTIFICATIVA_CURTA', 'Escreva pelo menos ' + JUSTIFICATIVA_MIN
        + ' caracteres explicando o que foi verificado e o que fundamenta a decisão.');
    }

    const jaRevisaram = revisoresDe(caso);
    const precisaDupla = !!caso.exigeRevisaoEmDupla;
    if (precisaDupla && jaRevisaram.indexOf(contexto.atorId) !== -1) {
      return erro('MESMO_REVISOR', 'Caso crítico exige duas pessoas diferentes. Quem já revisou não fecha o próprio caso.');
    }

    const agora = contexto.agora || new Date();
    const novo = JSON.parse(JSON.stringify(caso));
    novo.trilha = (novo.trilha || []).concat([{
      em: agora.toISOString(),
      ator: contexto.atorId,
      decisao: decisao,
      nota: justificativa,
    }]);
    if (!precisaDupla) {
      novo.decisao = decisao;
      novo.estado = 'RESOLVIDO';
      return { ok: true, caso: novo, erro: null };
    }

    if (jaRevisaram.length === 0) {
      /* A primeira revisão de caso crítico não decide nada: fica na trilha e
         espera a segunda pessoa. Gravar a decisão aqui a deixava valendo
         enquanto o caso diz que aguarda, e a segunda revisão a sobrescrevia
         sozinha, que é revisão sequencial e não revisão em dupla. */
      novo.decisao = null;
      novo.estado = 'AGUARDA_SEGUNDA_REVISAO';
      return { ok: true, caso: novo, erro: null };
    }

    const primeira = (caso.trilha || []).filter(function (t) { return t.decisao; })[0];
    if (primeira && primeira.decisao !== decisao) {
      /* Duas pessoas discordando num caso crítico não fecha pela escolha da
         segunda: escala. A segunda revisão não é desempate solitário. */
      novo.decisao = 'ESCALAR';
      novo.estado = 'RESOLVIDO';
      novo.divergencia = { de: primeira.decisao, para: decisao };
      return { ok: true, caso: novo, erro: null };
    }

    novo.decisao = decisao;
    novo.estado = 'RESOLVIDO';
    return { ok: true, caso: novo, erro: null };
  }

  const api = {
    DECISOES: DECISOES,
    JUSTIFICATIVA_MIN: JUSTIFICATIVA_MIN,
    fila: fila,
    decidir: decidir,
    revisoresDe: revisoresDe,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.moderacao = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
