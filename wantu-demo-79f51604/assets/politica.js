/* WANTU · política
   Motor determinístico, por regra, sem modelo de linguagem nenhum.
   Três saídas: LIBERADO, BLOQUEADO, REVISAO. Bloqueio acontece antes de o
   creator ver o texto; sinal incerto vai para a fila humana.

   Isto é demonstração de motor de política, não moderação de produção: tem
   falso positivo e falso negativo conhecidos, e produção exige classificador
   mais revisor humano treinado. Não conhece DOM nem armazenamento.          */

;(function (raiz) {
  'use strict';

  const TETO_CENTAVOS = 5000000; /* R$ 50.000 */

  const CLASSES = {
    DADO_DE_TERCEIRO: {
      id: 'DADO_DE_TERCEIRO',
      rotulo: 'Dado de contato ou documento',
      explicacao: 'O briefing não é lugar de arroba, telefone, CPF, e-mail ou link de perfil, de ninguém, inclusive o seu. Descreva a criação que você quer, sem identificar pessoa nenhuma.',
      saida: 'BLOQUEADO',
    },
    PESSOA_NAO_PARTICIPANTE: {
      id: 'PESSOA_NAO_PARTICIPANTE',
      rotulo: 'Conteúdo de alguém que não aderiu',
      explicacao: 'Só é possível propor um trabalho ao creator que você escolheu, e sobre o trabalho dele. Pedir conteúdo que retrate outra pessoa não cadastrada não é permitido, mesmo que você a conheça.',
      saida: 'BLOQUEADO',
    },
    MENCAO_A_MENOR: {
      id: 'MENCAO_A_MENOR',
      rotulo: 'Referência a menor de idade',
      explicacao: 'Qualquer referência a menor de idade, ou a aparência de menor, é proibida sem exceção e não tem apelação. O serviço existe só entre pessoas adultas verificadas.',
      saida: 'BLOQUEADO',
    },
    COERCAO: {
      id: 'COERCAO',
      rotulo: 'Pressão, ameaça ou insistência',
      explicacao: 'A proposta é um convite, e a recusa é um direito que não precisa de justificativa. Ameaça, chantagem, insistência depois de uma recusa e pressão por valor não passam daqui.',
      saida: 'BLOQUEADO',
    },
    IMPERSONATION: {
      id: 'IMPERSONATION',
      rotulo: 'Pedido de imitar outra pessoa',
      explicacao: 'Pedir que o creator imite, se passe por ou pareça outra pessoa real não é permitido, e conteúdo manipulado com a identidade de alguém também não.',
      saida: 'BLOQUEADO',
    },
    CONTATO_EXTERNO: {
      id: 'CONTATO_EXTERNO',
      rotulo: 'Convite para fora da plataforma',
      explicacao: 'Combinar por fora tira do creator as proteções de pagamento, entrega e contestação. Isto vai para análise humana antes de seguir.',
      saida: 'REVISAO',
    },
    TENTATIVA_DE_INJECAO: {
      id: 'TENTATIVA_DE_INJECAO',
      rotulo: 'Tentativa de comandar o sistema',
      explicacao: 'O texto do briefing é tratado como dado, nunca como instrução, então nada aqui muda regra, preço ou pagamento. Mesmo assim um pedido escrito para comandar o sistema vai para análise humana.',
      saida: 'REVISAO',
    },
    PESSOA_CITADA_SEM_CLAREZA: {
      id: 'PESSOA_CITADA_SEM_CLAREZA',
      rotulo: 'Menção a outra pessoa, sem clareza',
      explicacao: 'O texto cita outra pessoa junto a uma data ou a um presente, e não ficou claro se o trabalho pedido é sobre ela. Vai para análise humana antes de seguir, em vez de ser recusado por engano.',
      saida: 'REVISAO',
    },
    DADO_SENSIVEL_DO_COMPRADOR: {
      id: 'DADO_SENSIVEL_DO_COMPRADOR',
      rotulo: 'Dado seu que não é necessário',
      explicacao: 'Você escreveu um dado seu que o creator não precisa para produzir o trabalho. Guardar isso aumentaria seu risco sem nenhum ganho, então vai para análise.',
      saida: 'REVISAO',
    },
  };

  /* Tokens de alto sinal, testados contra a forma colapsada. A lista é curta
     de propósito: colapsar o texto inteiro contra todos os padrões criaria
     falso positivo (uma "foto instantânea" conteria "insta").               */
  const PLATAFORMAS = ['instagram', 'whatsapp', 'telegram', 'onlyfans', 'snapchat', 'tiktok', 'facebook', 'zap'];

  const TERCEIRO = /\b(?:minha|meu|minhas|meus)\s+(?:ex|esposa|esposo|mulher|marido|namorada|namorado|vizinha|vizinho|colega|amiga|amigo|prima|primo|irma|irmao|chefe|professora|professor|cunhada|cunhado|sogra|aluna|aluno|secretaria)\b|\b(?:a|o)\s+(?:menina|garota|moca|mulher|rapaz)\s+(?:do|da|de)\b/g;

  /* "ndo" pega gerúndio, e também palavras que não são verbo */
  const NAO_GERUNDIO = ['fundo', 'mundo', 'quando', 'segundo', 'profundo', 'redondo', 'fecundo', 'oriundo', 'imundo', 'rotundo'];

  const PADROES = [
    { classe: 'DADO_DE_TERCEIRO', re: /@\s*[a-z0-9._]{2,}/ },
    { classe: 'DADO_DE_TERCEIRO', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ },
    { classe: 'DADO_DE_TERCEIRO', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
    { classe: 'DADO_DE_TERCEIRO', re: /\(\d{2}\)\s?\d{4,5}-?\d{4}/ },
    { classe: 'DADO_DE_TERCEIRO', re: /\b\d{2}\s?9\d{4}[-\s]?\d{4}\b/ },
    { classe: 'DADO_DE_TERCEIRO', re: /\b\d{4,5}-\d{4}\b/ },

    { classe: 'MENCAO_A_MENOR', re: /\bnovinh[ao]s?\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\bcolegial\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\buniforme escolar\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\bmenor de idade\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\badolescent[ea]s?\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\bcrianc[ao]s?\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\bteen\b/ },
    /* Idade só vale como sinal junto a um marcador de pessoa. A regra larga
       bloqueava "10 anos de casamento" como referência a menor. */
    { classe: 'MENCAO_A_MENOR', re: /\b(?:aparencia|cara|jeito|tipo|parecendo|idade)\s+de\s+(?:1[0-7]|[1-9])\s*anos?\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\b(?:1[0-7]|[1-9])\s*anos?\s+de\s+idade\b/ },
    { classe: 'MENCAO_A_MENOR', re: /\b(?:menina|menino|garota|garoto|moca|rapaz|mulher|homem)\s+de\s+(?:1[0-7]|[1-9])\s*anos?\b/ },

    { classe: 'COERCAO', re: /\bse nao aceitar\b/ },
    { classe: 'COERCAO', re: /\bvou contar\b/ },
    { classe: 'COERCAO', re: /\bvou expor\b/ },
    { classe: 'COERCAO', re: /\bte exponho\b/ },
    { classe: 'COERCAO', re: /\bnao pode recusar\b/ },
    { classe: 'COERCAO', re: /\btem que aceitar\b/ },
    { classe: 'COERCAO', re: /\bja pedi antes\b/ },
    { classe: 'COERCAO', re: /\bquanto precisa para aceitar\b/ },
    { classe: 'COERCAO', re: /\bpago (?:o dobro|mais|o que for) se\b/ },
    { classe: 'COERCAO', re: /\bsua familia\b/ },

    { classe: 'IMPERSONATION', re: /\bfingindo ser\b/ },
    { classe: 'IMPERSONATION', re: /\bse passar por\b/ },
    { classe: 'IMPERSONATION', re: /\bdeepfake\b/ },
    { classe: 'IMPERSONATION', re: /\bimitando a\b/ },
    { classe: 'IMPERSONATION', re: /\bno lugar d[ae]\b/ },

    { classe: 'CONTATO_EXTERNO', re: /\bfora da plataforma\b/ },
    { classe: 'CONTATO_EXTERNO', re: /\bpor fora\b/ },
    { classe: 'CONTATO_EXTERNO', re: /\bme chama no\b/ },
    { classe: 'CONTATO_EXTERNO', re: /https?:\/\/\S+/ },
    { classe: 'CONTATO_EXTERNO', re: /\bwww\.\S+/ },
    { classe: 'CONTATO_EXTERNO', re: /\bdiscord\b/ },
    { classe: 'CONTATO_EXTERNO', re: /\bsignal\b/ },

    { classe: 'TENTATIVA_DE_INJECAO', re: /\bignore as (?:instrucoes|regras)\b/ },
    { classe: 'TENTATIVA_DE_INJECAO', re: /\b(?:instrucoes|regras) anteriores\b/ },
    { classe: 'TENTATIVA_DE_INJECAO', re: /\bsystem\s*:/ },
    { classe: 'TENTATIVA_DE_INJECAO', re: /\bassistant\s*:/ },
    { classe: 'TENTATIVA_DE_INJECAO', re: /\bpapel\s*=/ },
    { classe: 'TENTATIVA_DE_INJECAO', re: /\blibere o repasse\b/ },
    { classe: 'TENTATIVA_DE_INJECAO', re: /\bvoce agora e\b/ },

    { classe: 'DADO_SENSIVEL_DO_COMPRADOR', re: /\bmeu endereco\b/ },
    { classe: 'DADO_SENSIVEL_DO_COMPRADOR', re: /\bmoro n[ao]\b/ },
    { classe: 'DADO_SENSIVEL_DO_COMPRADOR', re: /\bnumero do cartao\b/ },
    { classe: 'DADO_SENSIVEL_DO_COMPRADOR', re: /\bmeu cartao\b/ },
  ];

  /* Grafia ofuscada nas duas classes mais graves, testada contra a forma
     COLAPSADA, onde não existe fronteira de palavra. Os tokens abaixo foram
     escolhidos um a um por não ter colisão plausível em português depois de
     os espaços caírem: "teen" ficou de fora de propósito, porque "sete
     entradas" colapsa em "seteentradas". */
  const COLAPSADOS = [
    { classe: 'MENCAO_A_MENOR', token: 'novinh' },
    { classe: 'MENCAO_A_MENOR', token: 'colegial' },
    { classe: 'MENCAO_A_MENOR', token: 'adolescent' },
    { classe: 'MENCAO_A_MENOR', token: 'menordeidade' },
    { classe: 'MENCAO_A_MENOR', token: 'uniformeescolar' },
    { classe: 'MENCAO_A_MENOR', token: 'crianc' },
    { classe: 'IMPERSONATION', token: 'fingindoser' },
    { classe: 'IMPERSONATION', token: 'sepassarpor' },
    { classe: 'IMPERSONATION', token: 'deepfake' },
  ];

  /* Substantivo de evento: o possessivo depois dele liga a pessoa à DATA, não
     ao conteúdo pedido. "presente de aniversário da minha esposa" não pede
     imagem da esposa, e bloquear isso faz o comprador ler uma explicação que
     não descreve o que ele escreveu. */
  const EVENTO = ['aniversario', 'casamento', 'bodas', 'formatura', 'nascimento',
    'presente', 'festa', 'noivado', 'natal', 'chegada', 'homenagem'];

  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };

  function normalizar(texto) {
    const cru = String(texto == null ? '' : texto);
    const limpo = cru
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const colapsado = limpo
      .replace(/[013457]/g, (d) => LEET[d])
      .replace(/[^a-z]/g, '');
    return { limpo: limpo, colapsado: colapsado, cru: cru };
  }

  function ehGerundio(palavra) {
    return /^[a-z]{3,}ndo$/.test(palavra) && NAO_GERUNDIO.indexOf(palavra) === -1;
  }

  /* Terceiro só viola quando é SUJEITO do conteúdo pedido, não quando é mera
     menção: "foto da minha esposa" viola, "de presente para a minha esposa"
     não. Sem esta distinção o filtro recusa pedido legítimo.                */
  function terceiroComoSujeito(limpo) {
    TERCEIRO.lastIndex = 0;
    let m;
    let duvida = null;
    while ((m = TERCEIRO.exec(limpo)) !== null) {
      const antes = limpo.slice(0, m.index).trim().split(/\s+/);
      const marcadorAntes = /^(de|da|do|das|dos)$/.test(antes[antes.length - 1] || '');
      const eventoAntes = EVENTO.indexOf(antes[antes.length - 2] || '') !== -1;
      const depois = limpo.slice(m.index + m[0].length).trim().split(/\s+/).slice(0, 2);
      const gerundioDepois = depois.some(ehGerundio);
      if (gerundioDepois) return { trecho: m[0], certeza: 'alta' };
      if (marcadorAntes && eventoAntes) { duvida = duvida || m[0]; continue; }
      if (marcadorAntes) return { trecho: m[0], certeza: 'alta' };
    }
    return duvida ? { trecho: duvida, certeza: 'baixa' } : null;
  }

  /* Nome próprio no meio da frase, que é o sinal de que a plataforma citada
     se refere a uma pessoa e não ao perfil do próprio creator */
  function nomeProprioNoMeio(cru) {
    const re = /(?:[a-zà-ÿ,]\s+)([A-ZÀ-Þ][a-zà-ÿ]{2,})/g;
    let m;
    while ((m = re.exec(cru)) !== null) {
      /* A marca citada não é o nome da pessoa citada. Sem esta exclusão,
         "no Instagram" era lido como referência a alguém, e a mesma frase
         era barrada ou encaminhada conforme a pessoa ter capitalizado. */
      const token = m[1].toLowerCase();
      if (PLATAFORMAS.indexOf(token) !== -1) continue;
      return m[1];
    }
    return null;
  }

  function avaliarBriefing(texto) {
    const n = normalizar(texto);
    const achadas = new Map();

    function registrar(classe, trecho) {
      if (!achadas.has(classe)) achadas.set(classe, trecho);
    }

    for (const p of PADROES) {
      const m = n.limpo.match(p.re);
      if (m) registrar(p.classe, m[0]);
    }

    for (const c of COLAPSADOS) {
      if (n.colapsado.indexOf(c.token) !== -1) registrar(c.classe, c.token);
    }

    const sujeito = terceiroComoSujeito(n.limpo);
    if (sujeito && sujeito.certeza === 'alta') registrar('PESSOA_NAO_PARTICIPANTE', sujeito.trecho);
    else if (sujeito) registrar('PESSOA_CITADA_SEM_CLAREZA', sujeito.trecho);

    /* "parecida com a Bruna" viola; "luz parecida com a do seu trabalho" não */
    const pareceCom = n.cru.match(/parecid[ao] com (?:a |o )?([A-ZÀ-Þ][a-zà-ÿ]{2,})/);
    if (pareceCom) registrar('IMPERSONATION', pareceCom[0]);

    const plataforma = PLATAFORMAS.find((t) => n.colapsado.indexOf(t) !== -1);
    if (plataforma) {
      registrar('CONTATO_EXTERNO', plataforma);
      const nome = nomeProprioNoMeio(n.cru);
      if (nome) registrar('DADO_DE_TERCEIRO', plataforma + ' / ' + nome);
    }

    const violacoes = Array.from(achadas.entries()).map(([classe, trecho]) => ({
      classe: classe,
      trecho: trecho,
      rotulo: CLASSES[classe].rotulo,
      explicacao: CLASSES[classe].explicacao,
      saida: CLASSES[classe].saida,
    }));

    let resultado = 'LIBERADO';
    if (violacoes.some((v) => v.saida === 'BLOQUEADO')) resultado = 'BLOQUEADO';
    else if (violacoes.length) resultado = 'REVISAO';

    return { resultado: resultado, violacoes: violacoes };
  }

  function categoriaDisponivel(creator, categoriaId) {
    if (!creator || !Array.isArray(creator.categorias)) return false;
    return creator.categorias.some((c) => c.id === categoriaId);
  }

  function valorMinimo(creator, categoriaId) {
    if (!creator || !Array.isArray(creator.categorias)) return null;
    const c = creator.categorias.find((x) => x.id === categoriaId);
    return c ? c.minimoCentavos : null;
  }

  function reais(centavos) {
    return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function recusa(codigo, mensagem) {
    return { ok: false, centavos: null, erro: { codigo: codigo, mensagem: mensagem } };
  }

  function validarValor(entrada, minimoCentavos) {
    const minimo = Number(minimoCentavos) || 0;
    let centavos;

    if (typeof entrada === 'number' && isFinite(entrada)) {
      centavos = Math.round(entrada * 100);
    } else {
      const bruto = String(entrada == null ? '' : entrada).replace(/r\$|\s/gi, '');
      if (!/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$|^-?\d+(,\d{1,2})?$/.test(bruto)) {
        return recusa('NAO_NUMERICO', 'Escreva só o valor, em números. Exemplo: 250 ou 250,00');
      }
      centavos = Math.round(parseFloat(bruto.replace(/\./g, '').replace(',', '.')) * 100);
    }

    if (!isFinite(centavos)) return recusa('NAO_NUMERICO', 'Escreva só o valor, em números. Exemplo: 250 ou 250,00');
    if (centavos < 0) return recusa('NEGATIVO', 'O valor da proposta não pode ser negativo');
    if (centavos === 0) return recusa('ZERO', 'Escreva quanto você quer oferecer por este trabalho');
    if (centavos > TETO_CENTAVOS) {
      return recusa('ACIMA_DO_TETO', 'Nesta demonstração o valor máximo de uma proposta é ' + reais(TETO_CENTAVOS));
    }
    if (centavos < minimo) {
      return recusa('ABAIXO_DO_MINIMO', 'Este creator definiu ' + reais(minimo) + ' como mínimo para esta modalidade');
    }
    return { ok: true, centavos: centavos, erro: null };
  }

  const api = {
    TETO_CENTAVOS: TETO_CENTAVOS,
    CLASSES: CLASSES,
    PLATAFORMAS: PLATAFORMAS,
    normalizar: normalizar,
    avaliarBriefing: avaliarBriefing,
    categoriaDisponivel: categoriaDisponivel,
    valorMinimo: valorMinimo,
    validarValor: validarValor,
    reais: reais,
  };

  raiz.WANTU = raiz.WANTU || {};
  raiz.WANTU.politica = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
