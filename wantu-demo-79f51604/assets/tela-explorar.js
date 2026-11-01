/* WANTU · tela explorar
   Catálogo com filtros. A tela só desenha: quem decide o que aparece é
   filtro.js, e quem decide se esta tela abre é papel.js.                  */

;(function () {
  'use strict';

  const W = window.WANTU;
  const A = W.app;

  const estadoFiltro = { modalidade: '', disponibilidade: 'aberta', precoMax: '', prazoMaxDias: '', busca: '' };

  function criterios() {
    return {
      modalidade: estadoFiltro.modalidade || null,
      disponibilidade: estadoFiltro.disponibilidade || null,
      precoMax: estadoFiltro.precoMax ? Number(estadoFiltro.precoMax) : null,
      prazoMaxDias: estadoFiltro.prazoMaxDias ? Number(estadoFiltro.prazoMaxDias) : null,
      busca: estadoFiltro.busca || null,
    };
  }

  function cartao(c) {
    const pausada = c.disponibilidade !== 'aberta';
    return '<a class="card-creator" href="creator.html?id=' + A.escapar(c.publicId) + '">'
      + '<span class="card-creator__retrato">' + W.retratos.svg(c.retratoSeed)
      + '<span class="chip ' + (pausada ? '' : 'chip--lime ') + 'card-creator__selo">'
      + (pausada ? 'Pausada' : 'Aderiu') + '</span></span>'
      + '<span class="card-creator__corpo">'
      + '<span class="card-creator__nome">' + A.escapar(c.pseudonimo) + '</span>'
      + '<span class="card-creator__tag">' + A.escapar(c.tagline) + '</span>'
      + '<span class="card-creator__chips">'
      + c.categorias.map(function (x) {
        const g = W.dados.CATEGORIAS.find(function (k) { return k.id === x.id; });
        return '<span class="chip">' + A.escapar(g ? g.rotulo.split(' ')[0] : x.id) + '</span>';
      }).join('')
      + '</span>'
      + '<span class="card-creator__rodape">'
      + '<span>a partir de <b class="card-creator__valor">' + A.dinheiro(c.minimoCentavos) + '</b></span>'
      + '<span>' + (pausada ? 'não recebe agora' : 'responde em ' + c.respostaMediaHoras + 'h') + '</span>'
      + '</span></span></a>';
  }

  function desenhar() {
    const achados = W.filtro.aplicar(A.estado().creators, criterios());
    const grade = document.getElementById('grade');
    const contagem = document.getElementById('contagem');

    contagem.textContent = achados.length === 0
      ? 'Nenhum creator com esses critérios'
      : achados.length + (achados.length === 1 ? ' creator encontrado' : ' creators encontrados');

    if (achados.length === 0) {
      grade.className = '';
      grade.innerHTML = '<div class="vazio">'
        + '<span class="vazio__marca" aria-hidden="true">✳</span>'
        + '<h3>Nada com esses critérios</h3>'
        + '<p>Tente uma faixa de valor maior, outra modalidade, ou inclua quem está com a agenda pausada.</p>'
        + '<button class="btn btn--primario btn--pequeno" type="button" id="limpar-vazio">Limpar os filtros</button>'
        + '</div>';
      document.getElementById('limpar-vazio').addEventListener('click', limpar);
      return;
    }

    grade.className = 'grade grade--4';
    grade.innerHTML = achados.map(cartao).join('');
  }

  function limpar() {
    estadoFiltro.modalidade = '';
    estadoFiltro.disponibilidade = '';
    estadoFiltro.precoMax = '';
    estadoFiltro.prazoMaxDias = '';
    estadoFiltro.busca = '';
    document.getElementById('f-modalidade').value = '';
    document.getElementById('f-disponibilidade').value = '';
    document.getElementById('f-preco').value = '';
    document.getElementById('f-prazo').value = '';
    document.getElementById('f-busca').value = '';
    desenhar();
  }

  function montarOpcoes() {
    const o = W.filtro.opcoes(A.estado().creators, W.dados.CATEGORIAS);
    const sel = document.getElementById('f-modalidade');
    sel.innerHTML = '<option value="">Todas as modalidades</option>'
      + o.modalidades.map(function (m) {
        return '<option value="' + A.escapar(m.id) + '">' + A.escapar(m.rotulo) + '</option>';
      }).join('');

    const preco = document.getElementById('f-preco');
    const degraus = [15000, 30000, 60000, 150000, 300000].filter(function (v) { return v <= o.faixaPreco.max * 1.2; });
    preco.innerHTML = '<option value="">Qualquer valor</option>'
      + degraus.map(function (v) {
        return '<option value="' + v + '">até ' + A.dinheiro(v) + '</option>';
      }).join('');

    const prazo = document.getElementById('f-prazo');
    prazo.innerHTML = '<option value="">Qualquer prazo</option>'
      + [3, 5, 7, 10, 14, 21].filter(function (d) { return d <= o.prazoMax; })
        .map(function (d) { return '<option value="' + d + '">até ' + d + ' dias</option>'; }).join('');
  }

  function ligar() {
    const campos = {
      'f-modalidade': 'modalidade',
      'f-disponibilidade': 'disponibilidade',
      'f-preco': 'precoMax',
      'f-prazo': 'prazoMaxDias',
    };
    Object.keys(campos).forEach(function (id) {
      document.getElementById(id).addEventListener('change', function (e) {
        estadoFiltro[campos[id]] = e.target.value;
        desenhar();
      });
    });

    let atraso = null;
    document.getElementById('f-busca').addEventListener('input', function (e) {
      clearTimeout(atraso);
      const v = e.target.value;
      atraso = setTimeout(function () { estadoFiltro.busca = v; desenhar(); }, 180);
    });

    document.getElementById('f-limpar').addEventListener('click', limpar);
  }

  function boot() {
    const veredito = A.iniciar('explorar');
    if (!veredito.ok) {
      A.mostrarNegativa(veredito);
      return;
    }
    A.esconderNegativa();
    document.getElementById('f-disponibilidade').value = 'aberta';
    montarOpcoes();
    ligar();
    desenhar();
  }

  window.aoAbrirPortao = boot;
  boot();
})();
