let sistemaTravado = false;
let configSistema = {};
let jogosVisiveis = [];
let palpitesUsuario = {};
let resultadosOficiaisEmEdicao = {};
let resumoRankingAtual = null;
let resumoPremiacaoAtual = null;
let adminUsuarios = [];
let adminParticipantesStatus = [];
let adminLogsResultados =
JSON.parse(localStorage.getItem("logsResultadosAdmin") || "[]");

let usuario = JSON.parse(
  localStorage.getItem("usuario")
);

const tokenSessao =
localStorage.getItem("sessaoToken");

if (!usuario || !tokenSessao) {
  window.location.href = "index.html";
  throw new Error("Sess\u00e3o inv\u00e1lida");
}

let credenciaisPendentes =
usuario.trocaObrigatoria === "SIM" ||
usuario.credenciais_pendentes === "SIM" ||
usuario.credenciaisPendentes === true;

let podeTrocarLogin =
usuario.loginAlterado !== "SIM" &&
usuario.login_alterado !== "SIM";

function participantesLiberados() {
  return configSistema.participantes_liberado === "SIM";
}

function mostrarFeedback(texto, tipo = "sucesso") {
  const feedback =
  document.getElementById("feedbackSistema");

  if (!feedback) {
    return;
  }

  feedback.textContent = texto;
  feedback.className =
  "feedback-sistema visivel " + tipo;

  window.clearTimeout(mostrarFeedback.timer);
  mostrarFeedback.timer =
  window.setTimeout(() => {
    feedback.classList.remove("visivel");
  }, 3600);
}

if (usuario.admin === "SIM") {
  document.body.classList.add("admin-page");
  resultadosOficiaisEmEdicao = JSON.parse(
    localStorage.getItem(
      CHAVE_RASCUNHO_RESULTADOS_OFICIAIS
    ) || "{}"
  );
  window.penaltisOficiaisEmEdicao = JSON.parse(
    localStorage.getItem(
      CHAVE_RASCUNHO_PENALTIS_OFICIAIS
    ) || "{}"
  );
}

document.getElementById("titulo").innerText =
"Ol\u00e1 " + usuario.nome;

if (usuario.admin === "SIM") {
  document.getElementById("tipo").innerHTML = `
    <h2>Painel Administrador</h2>
  `;
} else {
  document.getElementById("tipo").innerHTML = `
    <h2>Painel Participante</h2>
  `;
}


function definirLoadingBotao(botao, carregando, textoCarregando, textoNormal) {
  if (!botao) {
    return;
  }

  botao.disabled = carregando;
  botao.innerText =
  carregando ? textoCarregando : textoNormal;
}


function obterPalpiteJogo(jogoId) {
  return palpitesUsuario[jogoId] || {};
}

function obterTimeDoJogo(jogo, lado) {
  if (usuario.admin === "SIM") {
    return lado === "A"
    ? jogo.time_a
    : jogo.time_b;
  }

  const palpite =
  obterPalpiteJogo(jogo.jogo_id);

  if (lado === "A") {
    return palpite.time_a || jogo.time_a;
  }

  return palpite.time_b || jogo.time_b;
}

function obterValorPalpite(jogoId, lado) {
  const palpite =
  obterPalpiteJogo(jogoId);

  if (lado === "A") {
    return normalizarValorPlacar(
      palpite.palpite_a
    );
  }

  return normalizarValorPlacar(
    palpite.palpite_b
  );
}

function normalizarValorPlacar(valor) {
  if (valor === 0 || valor === "0") {
    return "0";
  }

  return valor || "";
}

function validarCampoPlacar(campo) {
  if (!campo) {
    return;
  }

  if (Number(campo.value) < 0) {
    campo.value = "";
  }
}

function valorPlacarInvalido(valor) {
  if (valor === "" || valor === null || valor === undefined) {
    return true;
  }

  return Number(valor) < 0 || Number.isNaN(Number(valor));
}

function obterClassificadoPalpite(jogoId) {
  const palpite =
  obterPalpiteJogo(jogoId);

  return palpite.classificado || "";
}

function jogoSemPalpite(jogoId) {
  const jogo =
  jogosVisiveis.find(item =>
    item.jogo_id == jogoId
  );

  const inputA =
  document.getElementById("a_" + jogoId);

  const inputB =
  document.getElementById("b_" + jogoId);

  const valorA =
  inputA
  ? inputA.value
  : obterValorPalpite(jogoId, "A");

  const valorB =
  inputB
  ? inputB.value
  : obterValorPalpite(jogoId, "B");

  if (valorA === "" || valorB === "") {
    return true;
  }

  if (
    jogo &&
    jogo.fase !== "grupos" &&
    Number(valorA) === Number(valorB)
  ) {
    const select =
    document.getElementById("c_" + jogoId);

    const classificado =
    select
    ? select.value
    : obterClassificadoPalpite(jogoId);

    return classificado === "";
  }

  return false;
}

function atualizarCampoClassificado(jogoId) {
  const jogo =
  jogosVisiveis.find(item =>
    item.jogo_id == jogoId
  );

  if (!jogo || jogo.fase === "grupos") {
    atualizarAvisoPalpites();
    return;
  }

  const inputA =
  document.getElementById("a_" + jogoId);

  const inputB =
  document.getElementById("b_" + jogoId);

  const campo =
  document.getElementById("classificado_" + jogoId);

  const select =
  document.getElementById("c_" + jogoId);

  if (!inputA || !inputB || !campo || !select) {
    atualizarAvisoPalpites();
    return;
  }

  const empate =
  inputA.value !== "" &&
  inputB.value !== "" &&
  Number(inputA.value) === Number(inputB.value);

  if (empate) {
    campo.classList.add("visivel");
    select.disabled = false;
  } else {
    campo.classList.remove("visivel");
    select.value = "";
    select.disabled = true;
  }

  atualizarAvisoPalpites();
}

function separarFasesDosJogos(jogos) {
  const fases = {
    grupos: [],
    fase_32: [],
    oitavas: [],
    quartas: [],
    semi: [],
    terceiro_lugar: [],
    final: []
  };

  jogos.forEach(jogo => {
    if (fases[jogo.fase]) {
      fases[jogo.fase].push(jogo);
    }
  });

  return fases;
}

function atualizarChaveamentoAoEditar() {
  if (usuario.admin === "SIM") {
    return;
  }

  atualizarChaveamentoEmMemoria();
  renderizarJogosParticipante(
    separarFasesDosJogos(jogosVisiveis)
  );
  atualizarAvisoPalpites();
}

function limparDestaquesPalpites() {
  document
  .querySelectorAll(".palpite-incompleto")
  .forEach(elemento => {
    elemento.classList.remove("palpite-incompleto");
  });
}

function atualizarAvisoPalpites() {
  if (usuario.admin === "SIM") {
    return [];
  }

  const faltantes =
  jogosVisiveis.filter(jogo =>
    jogoSemPalpite(jogo.jogo_id)
  );

  const aviso =
  document.getElementById("avisoPalpites");

  if (aviso) {
    if (faltantes.length === 0) {
      aviso.innerHTML = `
        Todos os palpites foram preenchidos.
        Sua aposta est&aacute; pronta para valida&ccedil;&atilde;o.
      `;
      aviso.className = "aviso-palpites completo";
    } else {
      aviso.innerHTML = `
        Faltam ${faltantes.length} jogos para preencher.
        Voc&ecirc; pode salvar como rascunho, mas se n&atilde;o preencher tudo
        a aposta n&atilde;o ser&aacute; validada.
      `;
      aviso.className = "aviso-palpites incompleto";
    }
  }

  atualizarResumoUsuario(faltantes);

  return faltantes;
}

function obterResumoPalpites(faltantesInformados) {
  if (usuario.admin === "SIM") {
    return {
      preenchidos: 0,
      total: 0,
      faltantes: 0,
      completo: false
    };
  }

  const faltantes =
  Array.isArray(faltantesInformados)
  ? faltantesInformados
  : jogosVisiveis.filter(jogo =>
    jogoSemPalpite(jogo.jogo_id)
  );

  const total =
  jogosVisiveis.length;

  return {
    preenchidos: Math.max(0, total - faltantes.length),
    total,
    faltantes: faltantes.length,
    completo: total > 0 && faltantes.length === 0
  };
}

function atualizarResumoUsuario(faltantesInformados) {
  const area =
  document.getElementById("resumoUsuario");

  if (!area) {
    return;
  }

  if (usuario.admin === "SIM") {
    renderizarDashboardAdmin();
    return;
  }

  const resumo =
  obterResumoPalpites(faltantesInformados);

  const ranking =
  resumoRankingAtual || [];

  const posicao =
  ranking.findIndex(item =>
    String(item.usuario_id) === String(usuario.id)
  );

  const meuRanking =
  posicao >= 0 ? ranking[posicao] : null;

  const premioEstimado =
  posicao === 0 && resumoPremiacaoAtual
  ? resumoPremiacaoAtual.premio1
  : posicao === 1 && resumoPremiacaoAtual
  ? resumoPremiacaoAtual.premio2
  : posicao === 2 && resumoPremiacaoAtual
  ? resumoPremiacaoAtual.premio3
  : 0;

  const status =
  sistemaTravado
  ? "Bol\u00e3o travado"
  : resumo.completo
  ? "Completo"
  : "Incompleto";

  area.innerHTML = `
    <section class="resumo-usuario ${resumo.completo ? "completo" : "incompleto"}">
      <div class="resumo-usuario-topo">
        <div>
          <span class="rotulo-resumo">Seu resumo</span>
          <h2>${status}</h2>
        </div>
        <strong>
          ${resumo.preenchidos}/${resumo.total}
        </strong>
      </div>

      <div class="grade-resumo-usuario">
        <article>
          <span>Palpites</span>
          <strong>
            ${
              resumo.faltantes === 0
              ? "Tudo preenchido"
              : "Faltam " + resumo.faltantes
            }
          </strong>
        </article>

        <article>
          <span>Ranking</span>
          <strong>
            ${posicao >= 0 ? (posicao + 1) + "\u00ba lugar" : "Aguardando"}
          </strong>
        </article>

        <article>
          <span>Pontos</span>
          <strong>
            ${meuRanking ? meuRanking.pontos : 0}
          </strong>
        </article>

        <article>
          <span>Pr\u00eamio estimado</span>
          <strong>
            ${
              premioEstimado
              ? "R$ " + premioEstimado.toFixed(2)
              : "-"
            }
          </strong>
        </article>
      </div>
    </section>
  `;
}

function obterJogosSemResultado() {
  return jogosVisiveis.filter(jogo =>
    normalizarValorPlacar(jogo.gol_a) === "" ||
    normalizarValorPlacar(jogo.gol_b) === ""
  );
}

function obterJogosEncerrados() {
  return jogosVisiveis.filter(jogo =>
    normalizarValorPlacar(jogo.gol_a) !== "" &&
    normalizarValorPlacar(jogo.gol_b) !== ""
  );
}

function formatarValorReais(valor) {
  return "R$ " + Number(valor || 0).toFixed(2);
}

function obterIdSecaoFaseAdmin(fase) {
  const mapa = {
    grupos: "fase-grupos",
    fase_32: "fase-32",
    oitavas: "fase-oitavas",
    quartas: "fase-quartas",
    semi: "fase-semi",
    terceiro_lugar: "fase-terceiro",
    final: "fase-final"
  };

  return mapa[fase] || fase;
}

function renderizarDashboardAdmin() {
  const area =
  document.getElementById("resumoUsuario");

  if (!area || usuario.admin !== "SIM") {
    return;
  }

  const participantes =
  adminUsuarios.filter(item =>
    item.admin !== "SIM"
  );

  const completos =
  adminParticipantesStatus.filter(item =>
    Array.isArray(item.faltantes)
    ? item.faltantes.length === 0
    : Number(item.faltantes || 0) === 0
  ).length;

  const totalStatus =
  adminParticipantesStatus.length;

  const incompletos =
  totalStatus > 0
  ? totalStatus - completos
  : 0;

  const pendentes =
  obterJogosSemResultado();

  const encerrados =
  obterJogosEncerrados();

  const travaTexto =
  sistemaTravado
  ? "Bol\u00e3o travado"
  : "Bol\u00e3o aberto";

  area.innerHTML = `
    <section class="admin-dashboard">
      <div class="admin-dashboard-topo">
        <div>
          <span class="rotulo-resumo">Controle do bol&atilde;o</span>
          <h2>Dashboard administrativo</h2>
        </div>

        <button
          type="button"
          class="${sistemaTravado ? "botao-destravar-bolao" : "botao-travar-bolao"}"
          onclick="alternarTravaBolao()"
          id="botaoTravaBolao"
        >
          ${sistemaTravado ? "Destravar bol&atilde;o" : "Travar bol&atilde;o"}
        </button>
      </div>

      <div class="grade-admin-metricas">
        <article>
          <span>Participantes</span>
          <strong>${participantes.length}</strong>
        </article>

        <article>
          <span>Palpites completos</span>
          <strong>${completos}</strong>
        </article>

        <article>
          <span>Palpites incompletos</span>
          <strong>${incompletos}</strong>
        </article>

        <article>
          <span>Total arrecadado</span>
          <strong>${formatarValorReais(resumoPremiacaoAtual && resumoPremiacaoAtual.totalArrecadado)}</strong>
        </article>

        <article>
          <span>Status da trava</span>
          <strong>${travaTexto}</strong>
        </article>

        <article>
          <span>Jogos pendentes</span>
          <strong>${pendentes.length}</strong>
        </article>
      </div>

      <div class="grade-admin-operacao">
        <section class="admin-operacao-card">
          <div class="admin-operacao-topo">
            <h3>Confer&ecirc;ncia de resultados</h3>
            <span>${encerrados.length} encerrados</span>
          </div>

          <div class="lista-admin-compacta">
            ${
              pendentes.slice(0, 8).map(jogo => `
                <button
                  type="button"
                  onclick="irParaSecao('${obterIdSecaoFaseAdmin(jogo.fase)}')"
                >
                  Jogo ${jogo.jogo_id} pendente
                  <small>${escaparHtml(jogo.time_a)} x ${escaparHtml(jogo.time_b)}</small>
                </button>
              `).join("") ||
              "<p class=\"texto-conta\">Nenhum jogo pendente de resultado.</p>"
            }
          </div>
        </section>

        <section class="admin-operacao-card">
          <div class="admin-operacao-topo">
            <h3>Logs recentes</h3>
            <span>${adminLogsResultados.length}</span>
          </div>

          <div class="lista-logs-admin">
            ${
              adminLogsResultados.slice(0, 6).map(log => `
                <article>
                  <strong>Jogo ${escaparHtml(log.jogo_id)}</strong>
                  <span>${escaparHtml(log.quando)}</span>
                  <small>
                    ${escaparHtml(log.anterior)} &rarr; ${escaparHtml(log.novo)}
                  </small>
                </article>
              `).join("") ||
              "<p class=\"texto-conta\">Nenhum resultado alterado nesta sess&atilde;o.</p>"
            }
          </div>
        </section>
      </div>
    </section>
  `;
}

function palpiteAdminPreenchido(palpite, jogo) {
  if (!palpite) {
    return false;
  }

  const temPlacar =
  normalizarValorPlacar(palpite.palpite_a) !== "" &&
  normalizarValorPlacar(palpite.palpite_b) !== "";

  if (!temPlacar) {
    return false;
  }

  if (
    jogo &&
    jogo.fase !== "grupos" &&
    Number(palpite.palpite_a) === Number(palpite.palpite_b)
  ) {
    return Boolean(palpite.classificado);
  }

  return true;
}

function calcularStatusAdminParticipantes(dados) {
  if (Array.isArray(dados.participantes)) {
    return dados.participantes;
  }

  const usuarios =
  (dados.usuarios || []).filter(item =>
    item.admin !== "SIM"
  );

  const palpitesPorUsuario = {};

  (dados.palpites || []).forEach(palpite => {
    const usuarioId =
    palpite.usuario_id;

    if (!palpitesPorUsuario[usuarioId]) {
      palpitesPorUsuario[usuarioId] = {};
    }

    palpitesPorUsuario[usuarioId][palpite.jogo_id] =
    palpite;
  });

  return usuarios.map(item => {
    const mapa =
    palpitesPorUsuario[item.id] || {};

    const faltantes =
    jogosVisiveis.filter(jogo =>
      !palpiteAdminPreenchido(
        mapa[jogo.jogo_id],
        jogo
      )
    );

    return {
      usuario: item,
      faltantes
    };
  });
}

async function carregarDadosAdmin() {
  if (usuario.admin !== "SIM") {
    return;
  }

  try {
    const usuarios =
    await chamarApiProtegida("listarUsuariosAdmin");

    adminUsuarios =
    usuarios.usuarios || [];
  } catch (erro) {
    adminUsuarios = [];
  }

  try {
    const participantes =
    await chamarApiProtegida("listarParticipantesStatus");

    adminParticipantesStatus =
    calcularStatusAdminParticipantes(participantes);
  } catch (erro) {
    adminParticipantesStatus = [];
  }

  renderizarDashboardAdmin();
}

async function alternarTravaBolao() {
  const botao =
  document.getElementById("botaoTravaBolao");

  const novoValor =
  sistemaTravado
  ? "2030-06-09 23:59"
  : "2000-01-01 00:00";

  try {
    definirLoadingBotao(
      botao,
      true,
      sistemaTravado ? "Destravando..." : "Travando...",
      sistemaTravado ? "Destravar bol\u00e3o" : "Travar bol\u00e3o"
    );

    const dados =
    await chamarApiProtegida(
      "atualizarConfig",
      {
        chave: "trava_palpites",
        valor: novoValor
      }
    );

    if (dados.erro) {
      mostrarFeedback(
        dados.mensagem || "N\u00e3o foi poss\u00edvel alterar a trava.",
        "erro"
      );
      return;
    }

    configSistema.trava_palpites = novoValor;
    sistemaTravado = !sistemaTravado;
    renderizarBarraSalvarPalpites();
    renderizarDashboardAdmin();
    mostrarFeedback(
      sistemaTravado ? "Bol\u00e3o travado." : "Bol\u00e3o destravado.",
      "sucesso"
    );
  } catch (erro) {
    mostrarFeedback(erro.message, "erro");
  } finally {
    definirLoadingBotao(
      botao,
      false,
      sistemaTravado ? "Destravar bol\u00e3o" : "Travar bol\u00e3o",
      sistemaTravado ? "Destravar bol\u00e3o" : "Travar bol\u00e3o"
    );
  }
}

function destacarPalpitesFaltantes(faltantes) {
  limparDestaquesPalpites();

  faltantes.forEach(jogo => {
    const card =
    document.querySelector(
      `[data-jogo-id="${jogo.jogo_id}"]`
    );

    if (card) {
      card.classList.add("palpite-incompleto");
    }
  });
}

function usuarioPrecisaDefinirCredenciais() {
  return usuario.admin !== "SIM" && credenciaisPendentes;
}

function abrirConfiguracoes() {
  const modal =
  document.getElementById("modalConfiguracoes");

  if (!modal) {
    return;
  }

  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
}

function fecharConfiguracoes() {
  if (usuarioPrecisaDefinirCredenciais()) {
    return;
  }

  const modal =
  document.getElementById("modalConfiguracoes");

  if (!modal) {
    return;
  }

  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
}

function renderizarPainelConta() {
  const painel =
  document.getElementById("painelConta");

  if (!painel) {
    return;
  }

  if (usuario.admin === "SIM") {
    painel.innerHTML = `
      <section class="painel-conta">
        <h3>Acesso dos participantes</h3>

        <p class="texto-conta">
          Controle se os participantes podem abrir a p&aacute;gina de acompanhamento dos participantes.
        </p>

        <button
          type="button"
          onclick="alternarParticipantesLiberados()"
          id="botaoLiberarParticipantes"
        >
          ${
            participantesLiberados()
            ? "Travar participantes"
            : "Liberar participantes"
          }
        </button>

        <p id="msgLiberarParticipantes" class="mensagem-conta"></p>
      </section>

      <section class="painel-conta">
        <h3>Criar usu&aacute;rio</h3>

        <div class="grade-form-conta grade-form-conta-admin">
          <input
            type="text"
            id="novoUsuarioNome"
            placeholder="Nome"
            autocomplete="off"
          >

          <input
            type="password"
            id="novoUsuarioSenha"
            placeholder="Senha provis&oacute;ria"
            autocomplete="new-password"
          >
        </div>

        <button
          type="button"
          onclick="criarUsuario()"
          id="botaoCriarUsuario"
        >
          Criar usu&aacute;rio
        </button>

        <p id="msgCriarUsuario" class="mensagem-conta"></p>
      </section>

      <section class="painel-conta">
        <div class="topo-lista-usuarios">
          <h3>Usu&aacute;rios cadastrados</h3>

          <button
            type="button"
            class="botao-atualizar-usuarios"
            onclick="carregarUsuariosAdmin()"
          >
            Atualizar
          </button>
        </div>

        <div id="listaUsuariosAdmin" class="lista-usuarios-admin">
          Carregando usu&aacute;rios...
        </div>
      </section>
    `;

    carregarUsuariosAdmin();

    return;
  }

  if (credenciaisPendentes) {
    painel.innerHTML = `
      <section class="painel-conta painel-credenciais-obrigatorias">
        <h3>Criar acesso permanente</h3>

        <p class="texto-conta">
          Seu acesso ainda &eacute; provis&oacute;rio. Crie seu login e senha permanentes para liberar a tela de palpites.
        </p>

        <div class="grade-form-conta">
          <input
            type="text"
            id="loginPermanente"
            placeholder="Novo login"
            autocomplete="username"
          >

          <input
            type="password"
            id="senhaAtualProvisoria"
            placeholder="Senha provis&oacute;ria"
            autocomplete="current-password"
          >

          <input
            type="password"
            id="senhaPermanente"
            placeholder="Nova senha"
            autocomplete="new-password"
          >

          <input
            type="password"
            id="confirmarSenhaPermanente"
            placeholder="Confirmar nova senha"
            autocomplete="new-password"
          >
        </div>

        <button
          type="button"
          onclick="definirCredenciaisPermanentes()"
          id="botaoCredenciaisPermanentes"
        >
          Salvar acesso permanente
        </button>

        <p id="msgCredenciaisPermanentes" class="mensagem-conta"></p>
      </section>
    `;

    return;
  }

  painel.innerHTML = `
    ${
      podeTrocarLogin
      ? `
        <section class="painel-conta">
          <h3>Alterar login</h3>

          <p class="texto-conta">
            Voc&ecirc; pode alterar seu nome de login apenas uma vez.
          </p>

          <div class="grade-form-conta grade-form-conta-admin">
            <input
              type="text"
              id="novoLoginUsuario"
              placeholder="Novo login"
              autocomplete="username"
            >

            <input
              type="password"
              id="senhaAtualLogin"
              placeholder="Senha atual"
              autocomplete="current-password"
            >
          </div>

          <button
            type="button"
            onclick="alterarLogin()"
            id="botaoAlterarLogin"
          >
            Alterar login
          </button>

          <p id="msgAlterarLogin" class="mensagem-conta"></p>
        </section>
      `
      : ""
    }

    <section class="painel-conta">
      <h3>Alterar senha</h3>

      <div class="grade-form-conta">
        <input
          type="password"
          id="senhaAtual"
          placeholder="Senha atual"
          autocomplete="current-password"
        >

        <input
          type="password"
          id="novaSenha"
          placeholder="Nova senha"
          autocomplete="new-password"
        >

        <input
          type="password"
          id="confirmarNovaSenha"
          placeholder="Confirmar nova senha"
          autocomplete="new-password"
        >
      </div>

      <button
        type="button"
        onclick="alterarSenha()"
        id="botaoAlterarSenha"
      >
        Alterar senha
      </button>

      <p id="msgAlterarSenha" class="mensagem-conta"></p>
    </section>
  `;
}

function atualizarLinkParticipantes() {
  const link =
  document.getElementById("linkParticipantes");

  if (!link) {
    return;
  }

  if (
    usuario.admin === "SIM" ||
    participantesLiberados()
  ) {
    link.classList.remove("botao-link-travado");
    link.href = "participantes.html";
    link.title = "";
    link.onclick = null;
    return;
  }

  link.classList.add("botao-link-travado");
  link.removeAttribute("href");
  link.title =
  "O administrador ainda n\u00e3o liberou esta tela.";
  link.onclick = evento => {
    evento.preventDefault();
    alert(
      "A tela de participantes ainda est\u00e1 travada pelo administrador."
    );
  };
}

async function alternarParticipantesLiberados() {
  const novoValor =
  participantesLiberados() ? "NAO" : "SIM";

  const botao =
  document.getElementById("botaoLiberarParticipantes");

  try {
    if (botao) {
      botao.disabled = true;
      botao.innerText =
      novoValor === "SIM" ? "Liberando..." : "Travando...";
    }

    const dados =
    await chamarApiProtegida(
      "atualizarConfig",
      {
        chave: "participantes_liberado",
        valor: novoValor
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgLiberarParticipantes",
        dados.mensagem || "N\u00e3o foi poss\u00edvel atualizar.",
        "erro"
      );
      return;
    }

    configSistema.participantes_liberado =
    novoValor;

    atualizarLinkParticipantes();
    renderizarPainelConta();
  } catch (erro) {
    definirMensagemConta(
      "msgLiberarParticipantes",
      "Erro ao atualizar libera\u00e7\u00e3o.",
      "erro"
    );
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.innerText =
      participantesLiberados()
      ? "Travar participantes"
      : "Liberar participantes";
    }
  }
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function carregarUsuariosAdmin() {
  if (usuario.admin !== "SIM") {
    return;
  }

  const lista =
  document.getElementById("listaUsuariosAdmin");

  if (!lista) {
    return;
  }

  lista.innerHTML =
  "Carregando usu&aacute;rios...";

  try {
    const dados =
    await chamarApiProtegida(
      "listarUsuariosAdmin"
    );

    if (dados.erro) {
      lista.innerHTML = `
        <p class="mensagem-conta erro">
          ${escaparHtml(dados.mensagem || "N\u00e3o foi poss\u00edvel carregar os usu\u00e1rios.")}
        </p>
      `;
      return;
    }

    const usuarios =
    dados.usuarios || [];

    adminUsuarios = usuarios;
    renderizarDashboardAdmin();

    if (usuarios.length === 0) {
      lista.innerHTML = `
        <p class="mensagem-conta">
          Nenhum usu&aacute;rio cadastrado.
        </p>
      `;
      return;
    }

    lista.innerHTML =
    usuarios.map(item => `
      <article
        class="linha-usuario-admin ${item.ativo === "SIM" ? "" : "usuario-bloqueado"}"
      >
        <div>
          <strong>${escaparHtml(item.nome)}</strong>
          <span>
            ID ${escaparHtml(item.id)}
            ${item.login ? " - " + escaparHtml(item.login) : ""}
            ${item.trocaObrigatoria === "SIM" ? " - acesso provis&oacute;rio" : ""}
            ${item.ativo === "SIM" ? "" : " - bloqueado"}
            ${
              item.pago === "SIM" || item.pagamento === "SIM"
              ? " - pago"
              : " - pagamento pendente"
            }
          </span>
        </div>

        <div class="acoes-usuario-admin">
          <button
            type="button"
            class="botao-pagamento-usuario ${item.pago === "SIM" || item.pagamento === "SIM" ? "pago" : ""}"
            title="Marcar pagamento"
            onclick="marcarPagamentoUsuario('${encodeURIComponent(item.id)}', '${item.pago === "SIM" || item.pagamento === "SIM" ? "NAO" : "SIM"}')"
          >
            $
          </button>

          <button
            type="button"
            class="botao-editar-usuario"
            title="Gerenciar usu&aacute;rio"
            onclick="abrirGestaoUsuario('${encodeURIComponent(item.id)}', '${encodeURIComponent(item.nome)}', '${encodeURIComponent(item.ativo || "")}')"
          >
            &#9998;
          </button>
        </div>
      </article>
    `).join("");
  } catch (erro) {
    lista.innerHTML = `
      <p class="mensagem-conta erro">
        Erro ao carregar usu&aacute;rios.
      </p>
    `;
  }
}

function abrirGestaoUsuario(
  usuarioIdCodificado,
  nomeCodificado,
  ativoCodificado
) {
  const usuarioId =
  decodeURIComponent(usuarioIdCodificado);

  const nome =
  decodeURIComponent(nomeCodificado);

  const ativo =
  decodeURIComponent(ativoCodificado);

  const lista =
  document.getElementById("listaUsuariosAdmin");

  if (!lista) {
    return;
  }

  const painelExistente =
  document.getElementById("formGestaoUsuario");

  if (painelExistente) {
    painelExistente.remove();
  }

  lista.insertAdjacentHTML(
    "afterbegin",
    `
      <div id="formGestaoUsuario" class="form-reset-usuario">
        <strong>
          Gerenciar ${escaparHtml(nome)}
        </strong>

        <p class="texto-conta">
          Use o reset para entregar uma senha provis&oacute;ria sem alterar os palpites do participante.
        </p>

        <input
          type="password"
          id="resetUsuarioSenha"
          placeholder="Nova senha provis&oacute;ria"
          autocomplete="new-password"
        >

        <div class="acoes-reset-usuario">
          <button
            type="button"
            onclick="resetarAcessoUsuario('${escaparHtml(usuarioId)}')"
            id="botaoResetarUsuario"
          >
            Confirmar reset
          </button>

          <button
            type="button"
            onclick="${
              ativo === "SIM"
              ? `bloquearUsuario('${escaparHtml(usuarioId)}')`
              : `desbloquearUsuario('${escaparHtml(usuarioId)}')`
            }"
            id="botaoBloquearUsuario"
            class="botao-bloquear-usuario"
          >
            ${ativo === "SIM" ? "Bloquear" : "Desbloquear"}
          </button>

          <button
            type="button"
            onclick="excluirUsuario('${encodeURIComponent(usuarioId)}', '${encodeURIComponent(nome)}')"
            id="botaoExcluirUsuario"
            class="botao-excluir-usuario"
          >
            Excluir
          </button>

          <button
            type="button"
            class="botao-cancelar-reset"
            onclick="fecharResetUsuario()"
          >
            Cancelar
          </button>
        </div>

        <p id="msgResetarUsuario" class="mensagem-conta"></p>
      </div>
    `
  );
}

function fecharResetUsuario() {
  const painel =
  document.getElementById("formGestaoUsuario");

  if (painel) {
    painel.remove();
  }
}

async function alterarStatusUsuario(usuarioId, ativo) {
  const botao =
  document.getElementById("botaoBloquearUsuario");

  try {
    if (botao) {
      botao.disabled = true;
      botao.innerText =
      ativo === "SIM" ? "Desbloqueando..." : "Bloqueando...";
    }

    const dados =
    await chamarApiProtegida(
      "alterarStatusUsuario",
      {
        usuario_id: usuarioId,
        ativo
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgResetarUsuario",
        dados.mensagem || "N\u00e3o foi poss\u00edvel alterar o status.",
        "erro"
      );
      return;
    }

    await carregarUsuariosAdmin();
  } catch (erro) {
    definirMensagemConta(
      "msgResetarUsuario",
      "Erro ao alterar status.",
      "erro"
    );
  }
}

function bloquearUsuario(usuarioId) {
  alterarStatusUsuario(usuarioId, "NAO");
}

function desbloquearUsuario(usuarioId) {
  alterarStatusUsuario(usuarioId, "SIM");
}

async function marcarPagamentoUsuario(usuarioIdCodificado, pago) {
  const usuarioId =
  decodeURIComponent(usuarioIdCodificado);

  try {
    const dados =
    await chamarApiProtegida(
      "marcarPagamentoUsuario",
      {
        usuario_id: usuarioId,
        pago
      }
    );

    if (dados.erro) {
      mostrarFeedback(
        dados.mensagem ||
        "N\u00e3o foi poss\u00edvel atualizar o pagamento.",
        "erro"
      );
      return;
    }

    mostrarFeedback(
      pago === "SIM" ? "Pagamento marcado." : "Pagamento desmarcado.",
      "sucesso"
    );

    await carregarUsuariosAdmin();
  } catch (erro) {
    mostrarFeedback(
      "Para marcar pagamento, implemente a rota marcarPagamentoUsuario no Apps Script.",
      "aviso"
    );
  }
}

async function excluirUsuario(usuarioIdCodificado, nomeCodificado) {
  const usuarioId =
  decodeURIComponent(usuarioIdCodificado);

  const nome =
  decodeURIComponent(nomeCodificado);

  const confirmou =
  window.confirm(
    "Excluir o usu\u00e1rio " + nome +
    "? Essa a\u00e7\u00e3o remove o cadastro e bloqueia o acesso."
  );

  if (!confirmou) {
    return;
  }

  const botao =
  document.getElementById("botaoExcluirUsuario");

  try {
    if (botao) {
      botao.disabled = true;
      botao.innerText = "Excluindo...";
    }

    const dados =
    await chamarApiProtegida(
      "excluirUsuario",
      {
        usuario_id: usuarioId
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgResetarUsuario",
        dados.mensagem || "N\u00e3o foi poss\u00edvel excluir o usu\u00e1rio.",
        "erro"
      );
      return;
    }

    await carregarUsuariosAdmin();
  } catch (erro) {
    definirMensagemConta(
      "msgResetarUsuario",
      "Erro ao excluir usu\u00e1rio.",
      "erro"
    );
  }
}

function definirMensagemConta(id, texto, tipo) {
  const mensagem =
  document.getElementById(id);

  if (!mensagem) {
    return;
  }

  mensagem.innerText = texto;
  mensagem.className =
  "mensagem-conta " + (tipo || "");
}

function limparCampos(ids) {
  ids.forEach(id => {
    const campo =
    document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });
}

async function criarUsuario() {
  const nome =
  document.getElementById("novoUsuarioNome").value.trim();

  const senha =
  document.getElementById("novoUsuarioSenha").value;

  const botao =
  document.getElementById("botaoCriarUsuario");

  if (!nome || !senha) {
    definirMensagemConta(
      "msgCriarUsuario",
      "Preencha nome e senha provis\u00f3ria.",
      "erro"
    );
    return;
  }

  if (senha.length < 4) {
    definirMensagemConta(
      "msgCriarUsuario",
      "A senha precisa ter pelo menos 4 caracteres.",
      "erro"
    );
    return;
  }

  try {
    botao.disabled = true;
    botao.innerText = "Criando...";

    const dados =
    await chamarApiProtegida(
      "criarUsuario",
      {
        nome,
        senha
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgCriarUsuario",
        dados.mensagem || "N\u00e3o foi poss\u00edvel criar o usu\u00e1rio.",
        "erro"
      );
      return;
    }

    limparCampos([
      "novoUsuarioNome",
      "novoUsuarioSenha"
    ]);

    definirMensagemConta(
      "msgCriarUsuario",
      dados.mensagem || "Usu\u00e1rio criado com sucesso.",
      "sucesso"
    );

    await carregarUsuariosAdmin();
  } catch (erro) {
    definirMensagemConta(
      "msgCriarUsuario",
      "Erro ao criar usu\u00e1rio.",
      "erro"
    );
  } finally {
    botao.disabled = false;
    botao.innerText = "Criar usu\u00e1rio";
  }
}

async function resetarAcessoUsuario(usuarioId) {
  const senha =
  document.getElementById("resetUsuarioSenha").value;

  const botao =
  document.getElementById("botaoResetarUsuario");

  if (!usuarioId || !senha) {
    definirMensagemConta(
      "msgResetarUsuario",
      "Informe a nova senha provis\u00f3ria.",
      "erro"
    );
    return;
  }

  if (senha.length < 4) {
    definirMensagemConta(
      "msgResetarUsuario",
      "A senha provis\u00f3ria precisa ter pelo menos 4 caracteres.",
      "erro"
    );
    return;
  }

  try {
    botao.disabled = true;
    botao.innerText = "Resetando...";

    const dados =
    await chamarApiProtegida(
      "resetarAcessoUsuario",
      {
        identificador: usuarioId,
        senha
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgResetarUsuario",
        dados.mensagem || "N\u00e3o foi poss\u00edvel resetar o acesso.",
        "erro"
      );
      return;
    }

    definirMensagemConta(
      "msgResetarUsuario",
      dados.mensagem || "Acesso resetado com sucesso.",
      "sucesso"
    );

    await carregarUsuariosAdmin();
  } catch (erro) {
    definirMensagemConta(
      "msgResetarUsuario",
      "Erro ao resetar acesso.",
      "erro"
    );
  } finally {
    botao.disabled = false;
    botao.innerText = "Resetar acesso";
  }
}

async function definirCredenciaisPermanentes() {
  const login =
  document.getElementById("loginPermanente").value.trim();

  const senhaAtual =
  document.getElementById("senhaAtualProvisoria").value;

  const novaSenha =
  document.getElementById("senhaPermanente").value;

  const confirmarSenha =
  document.getElementById("confirmarSenhaPermanente").value;

  const botao =
  document.getElementById("botaoCredenciaisPermanentes");

  if (!login || !senhaAtual || !novaSenha || !confirmarSenha) {
    definirMensagemConta(
      "msgCredenciaisPermanentes",
      "Preencha login, senha provis\u00f3ria e nova senha.",
      "erro"
    );
    return;
  }

  if (novaSenha !== confirmarSenha) {
    definirMensagemConta(
      "msgCredenciaisPermanentes",
      "A confirma\u00e7\u00e3o n\u00e3o confere com a nova senha.",
      "erro"
    );
    return;
  }

  if (novaSenha.length < 4) {
    definirMensagemConta(
      "msgCredenciaisPermanentes",
      "A nova senha precisa ter pelo menos 4 caracteres.",
      "erro"
    );
    return;
  }

  try {
    botao.disabled = true;
    botao.innerText = "Salvando...";

    const dados =
    await chamarApiProtegida(
      "definirCredenciaisPermanentes",
      {
        login,
        senha_atual: senhaAtual,
        nova_senha: novaSenha
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgCredenciaisPermanentes",
        dados.mensagem || "N\u00e3o foi poss\u00edvel salvar o acesso.",
        "erro"
      );
      return;
    }

    usuario = {
      ...usuario,
      login,
      trocaObrigatoria: "NAO",
      credenciais_pendentes: "NAO",
      credenciaisPendentes: false,
      loginAlterado: "SIM",
      login_alterado: "SIM"
    };

    credenciaisPendentes = false;
    podeTrocarLogin = false;

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuario)
    );

    definirMensagemConta(
      "msgCredenciaisPermanentes",
      dados.mensagem || "Acesso permanente criado com sucesso.",
      "sucesso"
    );

    fecharConfiguracoes();

    await carregarPalpites();
    await carregarJogos();
    renderizarBarraSalvarPalpites();
    renderizarPainelConta();
  } catch (erro) {
    definirMensagemConta(
      "msgCredenciaisPermanentes",
      "Erro ao salvar acesso permanente.",
      "erro"
    );
  } finally {
    botao.disabled = false;
    botao.innerText = "Salvar acesso permanente";
  }
}

async function alterarLogin() {
  const login =
  document.getElementById("novoLoginUsuario").value.trim();

  const senhaAtual =
  document.getElementById("senhaAtualLogin").value;

  const botao =
  document.getElementById("botaoAlterarLogin");

  if (!login || !senhaAtual) {
    definirMensagemConta(
      "msgAlterarLogin",
      "Preencha o novo login e sua senha atual.",
      "erro"
    );
    return;
  }

  try {
    botao.disabled = true;
    botao.innerText = "Alterando...";

    const dados =
    await chamarApiProtegida(
      "alterarLogin",
      {
        login,
        senha_atual: senhaAtual
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgAlterarLogin",
        dados.mensagem || "N\u00e3o foi poss\u00edvel alterar o login.",
        "erro"
      );
      return;
    }

    usuario = {
      ...usuario,
      login,
      loginAlterado: "SIM",
      login_alterado: "SIM"
    };

    podeTrocarLogin = false;

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuario)
    );

    renderizarPainelConta();
  } catch (erro) {
    definirMensagemConta(
      "msgAlterarLogin",
      "Erro ao alterar login.",
      "erro"
    );
  } finally {
    botao.disabled = false;
    botao.innerText = "Alterar login";
  }
}

async function alterarSenha() {
  const senhaAtual =
  document.getElementById("senhaAtual").value;

  const novaSenha =
  document.getElementById("novaSenha").value;

  const confirmarNovaSenha =
  document.getElementById("confirmarNovaSenha").value;

  const botao =
  document.getElementById("botaoAlterarSenha");

  if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
    definirMensagemConta(
      "msgAlterarSenha",
      "Preencha todos os campos de senha.",
      "erro"
    );
    return;
  }

  if (novaSenha !== confirmarNovaSenha) {
    definirMensagemConta(
      "msgAlterarSenha",
      "A confirma\u00e7\u00e3o n\u00e3o confere com a nova senha.",
      "erro"
    );
    return;
  }

  if (novaSenha.length < 4) {
    definirMensagemConta(
      "msgAlterarSenha",
      "A nova senha precisa ter pelo menos 4 caracteres.",
      "erro"
    );
    return;
  }

  try {
    botao.disabled = true;
    botao.innerText = "Alterando...";

    const dados =
    await chamarApiProtegida(
      "alterarSenha",
      {
        senha_atual: senhaAtual,
        nova_senha: novaSenha
      }
    );

    if (dados.erro) {
      definirMensagemConta(
        "msgAlterarSenha",
        dados.mensagem || "N\u00e3o foi poss\u00edvel alterar a senha.",
        "erro"
      );
      return;
    }

    limparCampos([
      "senhaAtual",
      "novaSenha",
      "confirmarNovaSenha"
    ]);

    definirMensagemConta(
      "msgAlterarSenha",
      dados.mensagem || "Senha alterada com sucesso.",
      "sucesso"
    );
  } catch (erro) {
    definirMensagemConta(
      "msgAlterarSenha",
      "Erro ao alterar senha.",
      "erro"
    );
  } finally {
    botao.disabled = false;
    botao.innerText = "Alterar senha";
  }
}

function renderizarAcoesAdmin() {
  const area = document.getElementById("acoesAdmin");

  if (!area) {
    return;
  }

  if (usuario.admin === "SIM") {
    area.innerHTML = `
      <button
        onclick="salvarTodosResultados()"
        class="btn-admin"
        id="botaoSalvarResultadosOficiais"
      >
        Salvar Resultados Oficiais
      </button>
    `;
  } else {
    area.innerHTML = "";
  }
}

function renderizarBarraSalvarPalpites() {
  const barra =
  document.getElementById("barraSalvarPalpites");

  if (!barra) {
    return;
  }

  if (
    usuario.admin === "SIM" ||
    sistemaTravado ||
    usuarioPrecisaDefinirCredenciais()
  ) {
    barra.innerHTML = "";
    barra.className = "";
    return;
  }

  barra.className = "barra-salvar-palpites";
  barra.innerHTML = `
    <span>
      Salve seus palpites a qualquer momento
    </span>

    <button
      onclick="salvarTodosPalpites()"
      id="botaoSalvarPalpites"
    >
      Salvar Palpites
    </button>
  `;
}

function renderizarAtalhosFases() {
  const atalhos = [
    ["Grupos", "fase-grupos"],
    ["Fase 32", "fase-32"],
    ["Oitavas", "fase-oitavas"],
    ["Quartas", "fase-quartas"],
    ["Semi", "fase-semi"],
    ["3&ordm; Lugar", "fase-terceiro"],
    ["Final", "fase-final"]
  ];

  return `
    <nav class="atalhos-fases">
      ${atalhos.map(([label, id]) => `
        <button
          type="button"
          onclick="irParaSecao('${id}')"
        >
          ${label}
        </button>
      `).join("")}
    </nav>

    <button
      type="button"
      class="botao-topo"
      onclick="irParaTopo()"
    >
      Topo
    </button>
  `;
}

function irParaSecao(id) {
  const elemento =
  document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function irParaTopo() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function verificarTrava() {
  const dados = await chamarApiPublica(
    API + "?acao=config"
  );

  configSistema =
  dados.config || {};

  const dataTrava = new Date(
    configSistema.trava_palpites
  );

  const agora = new Date();

  if (
    agora.getTime() >=
    dataTrava.getTime()
  ) {
    sistemaTravado = true;

    console.log(
      "SISTEMA TRAVADO"
    );
  }
}


async function carregarJogos() {
  const dados = await chamarApiPublica(
    API + "?acao=listarJogos"
  );

  jogosVisiveis = [];

  const fases = {
    grupos: [],
    fase_32: [],
    oitavas: [],
    quartas: [],
    semi: [],
    terceiro_lugar: [],
    final: []
  };

  dados.jogos.forEach(jogo => {
    if (!jogo.time_a || !jogo.time_b) {
      return;
    }

    jogosVisiveis.push(jogo);

    if (fases[jogo.fase]) {
      fases[jogo.fase].push(jogo);
    }
  });

  if (usuarioPrecisaDefinirCredenciais()) {
    document.getElementById("areaJogos").innerHTML = `
      <section class="aviso-credenciais">
        <h2>Acesso provis&oacute;rio</h2>
        <p>
          Antes de preencher os palpites, crie seu login e senha permanentes nas configura&ccedil;&otilde;es.
        </p>
        <button
          type="button"
          onclick="abrirConfiguracoes()"
        >
          Abrir configura&ccedil;&otilde;es
        </button>
      </section>
    `;

    return;
  }

  const estadoResultadosOficiais =
  usuario.admin === "SIM"
  ? criarEstadoResultadosOficiais()
  : {};

  function criarSecao(titulo, jogos, classeFase) {
    if (jogos.length === 0) {
      return "";
    }

    const jogosPorData = {};

    jogos.forEach(jogo => {
      const chaveData =
      obterChaveData(jogo.data);

      if (!jogosPorData[chaveData]) {
        jogosPorData[chaveData] = [];
      }

      jogosPorData[chaveData].push(jogo);
    });

    const datas =
    Object.keys(jogosPorData)
    .sort();

    let secao = `
      <div
        class="secao-fase ${classeFase}"
        id="${classeFase}"
      >
        <h2 class="titulo-fase">
          ${titulo}
        </h2>

        <div class="grade-datas">
    `;

    datas.forEach(data => {
      secao += `
        <div class="card-data">
          <h3>
            ${formatarData(data)}
          </h3>

          <div class="lista-jogos-data">
      `;

      jogosPorData[data].forEach(jogo => {
        const resultadoOficial =
        estadoResultadosOficiais[jogo.jogo_id];

        const palpiteSalvo =
        obterPalpiteJogo(jogo.jogo_id);

        const timeA =
        usuario.admin === "SIM" &&
        resultadoOficial
        ? resultadoOficial.time_a
        : obterTimeDoJogo(jogo, "A");

        const timeB =
        usuario.admin === "SIM" &&
        resultadoOficial
        ? resultadoOficial.time_b
        : obterTimeDoJogo(jogo, "B");

        const valorA =
        usuario.admin === "SIM"
        ? obterValorResultadoOficial(jogo, "A")
        : normalizarValorPlacar(
          palpiteSalvo.palpite_a
        );

        const valorB =
        usuario.admin === "SIM"
        ? obterValorResultadoOficial(jogo, "B")
        : normalizarValorPlacar(
          palpiteSalvo.palpite_b
        );

        const penaltis =
        obterPenaltisResultadoOficial(jogo.jogo_id);

        const mostrarPenaltis =
        usuario.admin === "SIM" &&
        jogo.fase !== "grupos" &&
        valorA !== "" &&
        valorB !== "" &&
        Number(valorA) === Number(valorB);

        secao += `
          <div class="linha-jogo-compacta">

            <div class="meta-jogo">
              <span>
                ${formatarHora(jogo.hora)}
              </span>

              ${
                jogo.fase === "grupos"
                ?
                `
                  <small>
                    Grupo ${jogo.grupo}
                  </small>
                `
                :
                `
                  <small>
                    ${titulo}
                  </small>
                `
              }
            </div>

            <div class="placar-jogo">
              <span
                class="time-jogo time-a"
                id="time_a_${jogo.jogo_id}"
              >
                ${renderizarTime(timeA)}
              </span>

              <input
                type="number"
                min="0"
                value="${valorA}"

                ${
                  sistemaTravado &&
                  usuario.admin !== "SIM"
                  ?
                  "disabled"
                  :
                  ""
                }

                id="a_${jogo.jogo_id}"
                class="input-gol"
                ${
                  usuario.admin === "SIM"
                  ? `oninput="validarCampoPlacar(this); atualizarChaveamentoOficialAoEditar()"`
                  : ""
                }
              >

              <span class="separador-placar">X</span>

              <input
                type="number"
                min="0"
                value="${valorB}"

                ${
                  sistemaTravado &&
                  usuario.admin !== "SIM"
                  ?
                  "disabled"
                  :
                  ""
                }

                id="b_${jogo.jogo_id}"
                class="input-gol"
                ${
                  usuario.admin === "SIM"
                  ? `oninput="validarCampoPlacar(this); atualizarChaveamentoOficialAoEditar()"`
                  : ""
                }
              >

              <span
                class="time-jogo time-b"
                id="time_b_${jogo.jogo_id}"
              >
                ${renderizarTime(timeB)}
              </span>
            </div>

            ${
              usuario.admin === "SIM" &&
              jogo.fase !== "grupos"
              ?
              `
                <div
                  class="placar-penaltis ${mostrarPenaltis ? "visivel" : ""}"
                  id="penaltis_${jogo.jogo_id}"
                >
                  <span class="rotulo-penaltis">P&ecirc;naltis</span>
                  <span class="campos-penaltis">
                    <input
                      type="number"
                      min="0"
                      value="${penaltis.penalti_a}"
                      id="pa_${jogo.jogo_id}"
                      class="input-penalti"
                      oninput="validarCampoPlacar(this); atualizarChaveamentoOficialAoEditar()"
                    >
                    <span>X</span>
                    <input
                      type="number"
                      min="0"
                      value="${penaltis.penalti_b}"
                      id="pb_${jogo.jogo_id}"
                      class="input-penalti"
                      oninput="validarCampoPlacar(this); atualizarChaveamentoOficialAoEditar()"
                    >
                  </span>
                </div>
              `
              :
              ""
            }

            ${
              usuario.admin === "SIM"
              ? `
                <div class="acoes-resultado-jogo">
                  <button
                    type="button"
                    id="botaoSalvarResultado_${jogo.jogo_id}"
                    onclick="salvarResultadoIndividual('${jogo.jogo_id}')"
                  >
                    Salvar jogo ${jogo.jogo_id}
                  </button>
                </div>
              `
              : ""
            }

          </div>
        `;
      });

      secao += `
          </div>
        </div>
      `;
    });

    secao += `
        </div>
      </div>
    `;

    return secao;
  }

  if (usuario.admin !== "SIM") {
    atualizarChaveamentoEmMemoria();
    renderizarJogosParticipante(fases);
    atualizarAvisoPalpites();
    return;
  }

  let html = `
    <h2>Jogos</h2>
    ${renderizarAtalhosFases()}
    ${renderizarStatusAdminResultados(
      estadoResultadosOficiais
    )}
  `;

  html += criarSecao(
    "Fase de Grupos",
    fases.grupos,
    "fase-grupos"
  );

  html += criarSecao(
    "Fase de 32",
    fases.fase_32,
    "fase-32"
  );

  html += criarSecao(
    "Oitavas de Final",
    fases.oitavas,
    "fase-oitavas"
  );

  html += criarSecao(
    "Quartas de Final",
    fases.quartas,
    "fase-quartas"
  );

  html += criarSecao(
    "Semifinal",
    fases.semi,
    "fase-semi"
  );

  html += criarSecao(
    "Disputa de 3\u00ba Lugar",
    fases.terceiro_lugar,
    "fase-terceiro"
  );

  html += criarSecao(
    "Final",
    fases.final,
    "fase-final"
  );

  document.getElementById(
    "areaJogos"
  ).innerHTML = html;
}

function renderizarJogoPalpite(jogo) {
  const timeA =
  obterTimeDoJogo(jogo, "A");

  const timeB =
  obterTimeDoJogo(jogo, "B");

  const classificado =
  obterClassificadoPalpite(jogo.jogo_id);

  const ehMataMata =
  jogo.fase !== "grupos";

  const valorA =
  obterValorPalpite(jogo.jogo_id, "A");

  const valorB =
  obterValorPalpite(jogo.jogo_id, "B");

  const empateMataMata =
  ehMataMata &&
  valorA !== "" &&
  valorB !== "" &&
  Number(valorA) === Number(valorB);

  return `
    <article
      class="jogo-rodada jogo-palpite"
      data-jogo-id="${jogo.jogo_id}"
    >
      <div class="meta-rodada">
        <span>${formatarData(jogo.data)}</span>
        <span>${formatarHora(jogo.hora)}</span>
      </div>

      <div class="card-palpite-horizontal">
        <div class="linha-times-palpite">
          <div class="time-palpite-horizontal">
            ${renderizarTime(timeA)}
          </div>

          <div class="time-palpite-horizontal">
            ${renderizarTime(timeB)}
          </div>
        </div>

        <div class="linha-placar-palpite">
          <div class="campo-gol-palpite">
            <input
              type="number"
              min="0"
              value="${valorA}"
            id="a_${jogo.jogo_id}"
            class="input-gol"
            oninput="validarCampoPlacar(this); atualizarCampoClassificado(${jogo.jogo_id})"
            onchange="atualizarChaveamentoAoEditar()"
          >
          </div>

          <span class="separador-placar">X</span>

          <div class="campo-gol-palpite">
            <input
              type="number"
              min="0"
              value="${valorB}"
            id="b_${jogo.jogo_id}"
            class="input-gol"
            oninput="validarCampoPlacar(this); atualizarCampoClassificado(${jogo.jogo_id})"
            onchange="atualizarChaveamentoAoEditar()"
          >
          </div>
        </div>
      </div>

      ${
        ehMataMata
        ?
        `
          <label
            class="campo-classificado ${empateMataMata ? "visivel" : ""}"
            id="classificado_${jogo.jogo_id}"
          >
            <span>Classificado</span>
            <select
              id="c_${jogo.jogo_id}"
              onchange="atualizarChaveamentoAoEditar()"
              ${empateMataMata ? "" : "disabled"}
            >
              <option value="">Selecione</option>
              <option
                value="${timeA}"
                ${classificado === timeA ? "selected" : ""}
              >
                ${timeA}
              </option>
              <option
                value="${timeB}"
                ${classificado === timeB ? "selected" : ""}
              >
                ${timeB}
              </option>
            </select>
          </label>
        `
        :
        ""
      }
    </article>
  `;
}

function criarGruposParticipante(jogos) {
  const grupos = {};

  jogos.forEach(jogo => {
    if (!grupos[jogo.grupo]) {
      grupos[jogo.grupo] = {
        times: [],
        jogos: []
      };
    }

    grupos[jogo.grupo].jogos.push(jogo);

    [jogo.time_a, jogo.time_b].forEach(time => {
      if (!grupos[jogo.grupo].times.includes(time)) {
        grupos[jogo.grupo].times.push(time);
      }
    });
  });

  return grupos;
}

function criarClassificacaoSimulada(grupo) {
  const tabela = {};

  grupo.times.forEach(time => {
    iniciarTimeClassificacao(tabela, time);
  });

  grupo.jogos.forEach(jogo => {
    const item = {
      time_a: jogo.time_a,
      time_b: jogo.time_b,
      palpite_a: obterValorPalpite(jogo.jogo_id, "A"),
      palpite_b: obterValorPalpite(jogo.jogo_id, "B")
    };

    if (!temPalpiteCompleto(item)) {
      return;
    }

    aplicarResultadoClassificacao(
      tabela,
      item.time_a,
      item.time_b,
      Number(item.palpite_a),
      Number(item.palpite_b)
    );
  });

  return Object.values(tabela)
  .sort(ordenarClassificacao);
}

function renderizarClassificacaoSimulada(classificacao) {
  return `
    <div class="tabela-classificacao-wrap">
      <table class="tabela-classificacao-copa">
        <thead>
          <tr>
            <th>Classifica&ccedil;&atilde;o simulada</th>
            <th>P</th>
            <th>J</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GP</th>
            <th>GC</th>
            <th>SG</th>
          </tr>
        </thead>
        <tbody>
          ${classificacao.map((item, index) => `
            <tr>
              <td>
                <span class="posicao-classificacao">
                  ${index + 1}
                </span>
                ${renderizarTime(item.time)}
              </td>
              <td><strong>${item.pontos}</strong></td>
              <td>${item.jogos}</td>
              <td>${item.vitorias}</td>
              <td>${item.empates}</td>
              <td>${item.derrotas}</td>
              <td>${item.golsPro}</td>
              <td>${item.golsContra}</td>
              <td>${item.saldo}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function dividirRodadasGrupo(jogos) {
  const ordenados =
  [...jogos].sort((a, b) =>
    (obterChaveData(a.data) + formatarHora(a.hora))
    .localeCompare(
      obterChaveData(b.data) + formatarHora(b.hora)
    )
  );

  const rodadas = [];

  ordenados.forEach((jogo, index) => {
    const rodada =
    Math.floor(index / 2);

    if (!rodadas[rodada]) {
      rodadas[rodada] = [];
    }

    rodadas[rodada].push(jogo);
  });

  return rodadas;
}

function renderizarGrupoParticipante(letra, grupo) {
  const classificacao =
  criarClassificacaoSimulada(grupo);

  const rodadas =
  dividirRodadasGrupo(grupo.jogos);

  return `
    <section class="grupo-tabela-oficial grupo-palpite">
      <h3>Grupo ${letra}</h3>

      ${renderizarClassificacaoSimulada(classificacao)}

      <div class="rodadas-grupo">
        ${rodadas.map((rodada, index) => `
          <section class="rodada-grupo">
            <h4>${index + 1}&ordf; rodada</h4>
            ${rodada.map(renderizarJogoPalpite).join("")}
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function renderizarMataMataParticipante(fases) {
  const fasesMataMata = [
    ["Fase de 32", fases.fase_32, "fase-32"],
    ["Oitavas de Final", fases.oitavas, "fase-oitavas"],
    ["Quartas de Final", fases.quartas, "fase-quartas"],
    ["Semifinal", fases.semi, "fase-semi"],
    ["Disputa de 3\u00ba Lugar", fases.terceiro_lugar, "fase-terceiro"],
    ["Final", fases.final, "fase-final"]
  ];

  return `
    <div class="mata-palpite">
      <h2>Mata-mata simulado</h2>

      ${fasesMataMata.map(([titulo, jogos, classe]) => `
        <section
          class="secao-fase ${classe} secao-mata-palpite"
          id="${classe}"
        >
          <h2 class="titulo-fase">${titulo}</h2>

          <div class="grade-mata-palpite ${
            classe === "fase-32"
            ? "grade-fase-32"
            : classe === "fase-oitavas"
            ? "grade-oitavas"
            : classe === "fase-quartas"
            ? "grade-quartas"
            : classe === "fase-terceiro" ||
              classe === "fase-final"
            ? "grade-decisao"
            : "grade-finais"
          }">
            ${jogos.map(renderizarJogoPalpite).join("")}
          </div>
        </section>
      `).join("")}
      ${renderizarResumoFinalSimulado()}
    </div>
  `;
}

function obterResultadoFinalJogo(jogoId) {
  const jogo =
  jogosVisiveis.find(item =>
    item.jogo_id == jogoId
  );

  if (!jogo) {
    return null;
  }

  const timeA =
  obterTimeDoJogo(jogo, "A");

  const timeB =
  obterTimeDoJogo(jogo, "B");

  const palpiteA =
  obterValorPalpite(jogoId, "A");

  const palpiteB =
  obterValorPalpite(jogoId, "B");

  if (palpiteA === "" || palpiteB === "") {
    return null;
  }

  const golsA = Number(palpiteA);
  const golsB = Number(palpiteB);
  const classificado =
  obterClassificadoPalpite(jogoId);

  let vencedor = "";

  if (golsA > golsB) {
    vencedor = timeA;
  } else if (golsB > golsA) {
    vencedor = timeB;
  } else {
    vencedor = classificado;
  }

  if (!vencedor) {
    return null;
  }

  return {
    vencedor,
    perdedor: vencedor === timeA
    ? timeB
    : timeA
  };
}

function renderizarResumoFinalSimulado() {
  const final =
  obterResultadoFinalJogo(104);

  const terceiro =
  obterResultadoFinalJogo(103);

  if (!final && !terceiro) {
    return "";
  }

  const itens = [
    ["Campe&atilde;o", final ? final.vencedor : "A definir"],
    ["Vice", final ? final.perdedor : "A definir"],
    ["3&ordm; lugar", terceiro ? terceiro.vencedor : "A definir"],
    ["4&ordm; lugar", terceiro ? terceiro.perdedor : "A definir"]
  ];

  return `
    <section class="resumo-final-simulado">
      <h2>Resultado final simulado</h2>

      <div class="grade-resumo-final">
        ${itens.map(([titulo, time]) => `
          <article>
            <strong>${titulo}</strong>
            <span>${renderizarTime(time)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderizarJogosParticipante(fases) {
  const grupos =
  criarGruposParticipante(fases.grupos);

  const letras =
  Object.keys(grupos).sort();

  let html = `
    <h2>Seus palpites</h2>

    ${renderizarAtalhosFases()}

    <div id="avisoPalpites" class="aviso-palpites"></div>
  `;

  html += letras.map(letra =>
    renderizarGrupoParticipante(
      letra,
      grupos[letra]
    )
  ).join("");

  html += renderizarMataMataParticipante(fases);

  document.getElementById("areaJogos").innerHTML =
  html;
}

async function carregarPalpites() {
  palpitesUsuario = {};

  if (usuario.admin === "SIM") {
    return;
  }

  const dados =
  await chamarApiProtegida(
    "listarPalpites",
    {
      usuario_id: usuario.id
    }
  );

  dados.palpites.forEach(p => {
    palpitesUsuario[p.jogo_id] = p;
  });
}

function criarEstadoPalpites() {
  const estado = {};

  jogosVisiveis.forEach(jogo => {
    const palpiteSalvo =
    obterPalpiteJogo(jogo.jogo_id);

    const inputA =
    document.getElementById("a_" + jogo.jogo_id);

    const inputB =
    document.getElementById("b_" + jogo.jogo_id);

    estado[jogo.jogo_id] = {
      jogo,
      jogo_id: jogo.jogo_id,
      fase: jogo.fase,
      grupo: jogo.grupo,
      time_a: palpiteSalvo.time_a ||
      jogo.time_a,
      time_b: palpiteSalvo.time_b ||
      jogo.time_b,
      palpite_a: inputA
      ? inputA.value
      : palpiteSalvo.palpite_a || "",
      palpite_b: inputB
      ? inputB.value
      : palpiteSalvo.palpite_b || ""
      ,
      classificado: (() => {
        const select =
        document.getElementById(
          "c_" + jogo.jogo_id
        );

        return select
        ? select.value
        : palpiteSalvo.classificado || "";
      })()
    };
  });

  return estado;
}

function obterValorResultadoOficial(jogo, lado) {
  const editado =
  resultadosOficiaisEmEdicao[jogo.jogo_id];

  const valor =
  editado
  ? lado === "A"
    ? editado.gol_a
    : editado.gol_b
  : lado === "A"
    ? jogo.gol_a
    : jogo.gol_b;

  return normalizarValorPlacar(valor);
}

function obterPenaltisResultadoOficial(jogoId) {
  const penaltis =
  window.penaltisOficiaisEmEdicao || {};

  const item =
  penaltis[jogoId] || {};

  return {
    penalti_a: normalizarValorPlacar(
      item.penalti_a
    ),
    penalti_b: normalizarValorPlacar(
      item.penalti_b
    )
  };
}

function obterClassificadoResultadoOficial(jogoId, timeA, timeB) {
  const penaltis =
  obterPenaltisResultadoOficial(jogoId);

  if (
    penaltis.penalti_a === "" ||
    penaltis.penalti_b === ""
  ) {
    return "";
  }

  const penaltiA =
  Number(penaltis.penalti_a);

  const penaltiB =
  Number(penaltis.penalti_b);

  if (penaltiA > penaltiB) {
    return timeA;
  }

  if (penaltiB > penaltiA) {
    return timeB;
  }

  return "";
}

function registrarResultadosOficiaisEmEdicao() {
  if (usuario.admin !== "SIM") {
    return;
  }

  const penaltis =
  window.penaltisOficiaisEmEdicao || {};

  jogosVisiveis.forEach(jogo => {
    const inputA =
    document.getElementById(
      "a_" + jogo.jogo_id
    );

    const inputB =
    document.getElementById(
      "b_" + jogo.jogo_id
    );

    if (!inputA || !inputB) {
      return;
    }

    resultadosOficiaisEmEdicao[jogo.jogo_id] = {
      gol_a: inputA.value,
      gol_b: inputB.value
    };

    const inputPenaltiA =
    document.getElementById(
      "pa_" + jogo.jogo_id
    );

    const inputPenaltiB =
    document.getElementById(
      "pb_" + jogo.jogo_id
    );

    if (inputPenaltiA && inputPenaltiB) {
      penaltis[jogo.jogo_id] = {
        penalti_a: inputPenaltiA.value,
        penalti_b: inputPenaltiB.value
      };
    }
  });

  window.penaltisOficiaisEmEdicao = penaltis;

  localStorage.setItem(
    CHAVE_RASCUNHO_RESULTADOS_OFICIAIS,
    JSON.stringify(resultadosOficiaisEmEdicao)
  );

  localStorage.setItem(
    CHAVE_RASCUNHO_PENALTIS_OFICIAIS,
    JSON.stringify(penaltis)
  );
}

function criarEstadoResultadosOficiais() {
  const estado = {};

  jogosVisiveis.forEach(jogo => {
    estado[jogo.jogo_id] = {
      jogo,
      jogo_id: jogo.jogo_id,
      fase: jogo.fase,
      grupo: jogo.grupo,
      time_a: jogo.time_a,
      time_b: jogo.time_b,
      palpite_a: obterValorResultadoOficial(
        jogo,
        "A"
      ),
      palpite_b: obterValorResultadoOficial(
        jogo,
        "B"
      ),
      classificado: obterClassificadoResultadoOficial(
        jogo.jogo_id,
        jogo.time_a,
        jogo.time_b
      )
    };
  });

  gerarFase32DoPalpite(estado);
  avancarMataMataDoPalpite(estado);

  return estado;
}

function obterJogosGrupoFaltantes(estado) {
  return Object.values(estado)
  .filter(item =>
    item.fase === "grupos" &&
    !temPalpiteCompleto(item)
  );
}

function obterJogosGrupoFaltantesDaApi(jogos) {
  return jogos.filter(jogo =>
    jogo.fase === "grupos" &&
    (
      normalizarValorPlacar(jogo.gol_a) === "" ||
      normalizarValorPlacar(jogo.gol_b) === ""
    )
  );
}

function renderizarStatusAdminResultados(estado) {
  const faltantes =
  obterJogosGrupoFaltantes(estado);

  if (faltantes.length === 0) {
    return `
      <div
        id="statusAdminResultados"
        class="status-admin-resultados completo"
      >
        Fase de grupos completa. A fase de 32 ser&aacute; montada automaticamente.
      </div>
    `;
  }

  return `
    <div
      id="statusAdminResultados"
      class="status-admin-resultados pendente"
    >
      Faltam ${faltantes.length} resultados da fase de grupos para montar a fase de 32.
      Jogos: ${faltantes.map(item => item.jogo_id).join(", ")}
    </div>
  `;
}

function atualizarStatusAdminResultados(estado) {
  const status =
  document.getElementById(
    "statusAdminResultados"
  );

  if (!status) {
    return;
  }

  const faltantes =
  obterJogosGrupoFaltantes(estado);

  if (faltantes.length === 0) {
    status.className =
    "status-admin-resultados completo";

    status.innerHTML =
    "Fase de grupos completa. A fase de 32 ser&aacute; montada automaticamente.";

    return;
  }

  status.className =
  "status-admin-resultados pendente";

  status.innerHTML =
  "Faltam " + faltantes.length +
  " resultados da fase de grupos para montar a fase de 32. Jogos: " +
  faltantes.map(item => item.jogo_id).join(", ");
}

function atualizarBotaoSalvarResultados(texto, salvando) {
  const botao =
  document.getElementById(
    "botaoSalvarResultadosOficiais"
  );

  if (!botao) {
    return;
  }

  botao.innerText = texto;
  botao.disabled = salvando;
}

function placarPareceAbsurdo(golA, golB) {
  return Number(golA) > 20 || Number(golB) > 20;
}

function registrarLogResultado(jogo, golA, golB) {
  const anterior =
  normalizarValorPlacar(jogo.gol_a) === "" ||
  normalizarValorPlacar(jogo.gol_b) === ""
  ? "sem resultado"
  : jogo.gol_a + " x " + jogo.gol_b;

  const novo =
  golA + " x " + golB;

  if (anterior === novo) {
    return;
  }

  adminLogsResultados.unshift({
    jogo_id: jogo.jogo_id,
    usuario: usuario.nome,
    quando: new Date().toLocaleString("pt-BR"),
    anterior,
    novo
  });

  adminLogsResultados =
  adminLogsResultados.slice(0, 60);

  localStorage.setItem(
    "logsResultadosAdmin",
    JSON.stringify(adminLogsResultados)
  );
}

async function salvarResultadoOficial(item) {
  await chamarApiProtegida(
    "salvarResultado",
    {
      jogo_id: item.jogo.jogo_id,
      gol_a: item.golA,
      gol_b: item.golB
    }
  );

  registrarLogResultado(
    item.jogo,
    item.golA,
    item.golB
  );
}

async function salvarResultadoIndividual(jogoId) {
  const jogo =
  jogosVisiveis.find(item =>
    String(item.jogo_id) === String(jogoId)
  );

  const inputA =
  document.getElementById("a_" + jogoId);

  const inputB =
  document.getElementById("b_" + jogoId);

  const botao =
  document.getElementById("botaoSalvarResultado_" + jogoId);

  if (!jogo || !inputA || !inputB) {
    mostrarFeedback("Jogo n\u00e3o encontrado na tela.", "erro");
    return;
  }

  if (
    inputA.value === "" ||
    inputB.value === "" ||
    valorPlacarInvalido(inputA.value) ||
    valorPlacarInvalido(inputB.value)
  ) {
    mostrarFeedback(
      "Preencha um placar v\u00e1lido para o jogo " + jogoId + ".",
      "erro"
    );
    return;
  }

  if (
    placarPareceAbsurdo(inputA.value, inputB.value) &&
    !window.confirm(
      "O placar " + inputA.value + " x " + inputB.value +
      " parece muito alto. Confirmar mesmo assim?"
    )
  ) {
    return;
  }

  try {
    definirLoadingBotao(
      botao,
      true,
      "Salvando...",
      "Salvar jogo " + jogoId
    );

    await salvarResultadoOficial({
      jogo,
      golA: inputA.value,
      golB: inputB.value
    });

    mostrarFeedback(
      "Resultado do jogo " + jogoId + " atualizado.",
      "sucesso"
    );

    await carregarJogos();
    renderizarDashboardAdmin();
  } catch (erro) {
    mostrarFeedback(erro.message, "erro");
  } finally {
    definirLoadingBotao(
      botao,
      false,
      "Salvando...",
      "Salvar jogo " + jogoId
    );
  }
}

async function salvarResultadosEmParalelo(jogosParaSalvar) {
  const tamanhoLote = 8;
  let totalSalvos = 0;
  const falhas = [];

  for (
    let inicio = 0;
    inicio < jogosParaSalvar.length;
    inicio += tamanhoLote
  ) {
    const lote =
    jogosParaSalvar.slice(
      inicio,
      inicio + tamanhoLote
    );

    const resultados =
    await Promise.allSettled(
      lote.map(item =>
        salvarResultadoOficial(item)
      )
    );

    resultados.forEach((resultado, index) => {
      if (resultado.status === "fulfilled") {
        totalSalvos++;
      } else {
        falhas.push(
          lote[index].jogo.jogo_id
        );
      }
    });

    atualizarBotaoSalvarResultados(
      "Salvando " + totalSalvos +
      "/" + jogosParaSalvar.length,
      true
    );
  }

  return {
    totalSalvos,
    falhas
  };
}

function atualizarChaveamentoOficialAoEditar() {
  if (usuario.admin !== "SIM") {
    return;
  }

  registrarResultadosOficiaisEmEdicao();

  const estado =
  criarEstadoResultadosOficiais();

  atualizarStatusAdminResultados(estado);

  Object.values(estado).forEach(item => {
    if (item.fase === "grupos") {
      return;
    }

    const campoPenaltis =
    document.getElementById(
      "penaltis_" + item.jogo_id
    );

    const mostrarPenaltis =
    item.palpite_a !== "" &&
    item.palpite_b !== "" &&
    Number(item.palpite_a) ===
    Number(item.palpite_b);

    if (campoPenaltis) {
      campoPenaltis.classList.toggle(
        "visivel",
        mostrarPenaltis
      );
    }

    const timeA =
    document.getElementById(
      "time_a_" + item.jogo_id
    );

    const timeB =
    document.getElementById(
      "time_b_" + item.jogo_id
    );

    if (timeA) {
      timeA.innerHTML =
      renderizarTime(item.time_a);
    }

    if (timeB) {
      timeB.innerHTML =
      renderizarTime(item.time_b);
    }
  });
}

function temPalpiteCompleto(item) {
  return item &&
  item.palpite_a !== "" &&
  item.palpite_b !== "";
}



function gerarFase32DoPalpite(estado) {
  const grupos = {};

  Object.values(estado).forEach(item => {
    if (item.fase !== "grupos") {
      return;
    }

    if (!grupos[item.grupo]) {
      grupos[item.grupo] = {};
    }

    iniciarTimeClassificacao(
      grupos[item.grupo],
      item.time_a
    );

    iniciarTimeClassificacao(
      grupos[item.grupo],
      item.time_b
    );

    if (!temPalpiteCompleto(item)) {
      return;
    }

    aplicarResultadoClassificacao(
      grupos[item.grupo],
      item.time_a,
      item.time_b,
      Number(item.palpite_a),
      Number(item.palpite_b)
    );
  });

  const classificados = {};
  const terceiros = [];

  for (const grupo in grupos) {
    const ordenado =
    Object.values(grupos[grupo])
    .sort(ordenarClassificacao);

    if (
      ordenado.length < 4 ||
      ordenado.some(time => time.jogos < 3)
    ) {
      return false;
    }

    classificados["1" + grupo] =
    ordenado[0].time;

    classificados["2" + grupo] =
    ordenado[1].time;

    terceiros.push({
      grupo,
      time: ordenado[2].time,
      pontos: ordenado[2].pontos,
      vitorias: ordenado[2].vitorias,
      saldo: ordenado[2].saldo,
      golsPro: ordenado[2].golsPro
    });
  }

  const terceirosClassificados =
  terceiros
  .sort(ordenarClassificacao)
  .slice(0, 8);

  terceirosClassificados
  .forEach(terceiro => {
    classificados["3" + terceiro.grupo] =
    terceiro.time;
  });

  const terceirosFifa =
  obterTerceirosFifaPalpite(
    terceirosClassificados
  );

  if (!terceirosFifa) {
    return false;
  }

  Object.keys(mapaFase32Palpite)
  .forEach(jogoId => {
    const confronto =
    mapaFase32Palpite[jogoId];

    const colunaFifa =
    mapaColunasFifaTerceiros[jogoId];

    const codigoTerceiro =
    colunaFifa
    ? terceirosFifa[colunaFifa]
    : null;

    const timeA =
    confronto[0].startsWith("3")
    ? classificados[codigoTerceiro] ||
      confronto[0]
    : resolverClassificadoPalpite(
      confronto[0],
      classificados
    );

    const timeB =
    confronto[1].startsWith("3")
    ? classificados[codigoTerceiro] ||
      confronto[1]
    : resolverClassificadoPalpite(
      confronto[1],
      classificados
    );

    estado[jogoId].time_a =
    timeA;

    estado[jogoId].time_b =
    timeB;
  });

  return true;
}

function definirTimeEstado(estado, jogoId, lado, time) {
  if (!estado[jogoId]) {
    return;
  }

  if (lado === "A") {
    estado[jogoId].time_a = time;
  }

  if (lado === "B") {
    estado[jogoId].time_b = time;
  }
}

function avancarMataMataDoPalpite(estado) {
  const avisos = [];

  ordemMataMataPalpite.forEach(jogoId => {
    const item = estado[jogoId];

    if (!temPalpiteCompleto(item)) {
      return;
    }

    const golsA = Number(item.palpite_a);
    const golsB = Number(item.palpite_b);

    const regra = avancosPalpite[jogoId];

    if (!regra) {
      return;
    }

    let vencedor = "";

    if (golsA > golsB) {
      vencedor = item.time_a;
    } else if (golsB > golsA) {
      vencedor = item.time_b;
    } else {
      vencedor =
      item.classificado ||
      obterClassificadoResultadoOficial(
        item.jogo_id,
        item.time_a,
        item.time_b
      );
    }

    if (!vencedor) {
      avisos.push(
        "Jogo " + jogoId +
        " terminou empatado. Escolha quem se classifica."
      );
      return;
    }

    const perdedor =
    vencedor === item.time_a
    ? item.time_b
    : item.time_a;

    if (regra.vencedor) {
      definirTimeEstado(
        estado,
        regra.vencedor[0],
        regra.vencedor[1],
        vencedor
      );
    }

    if (regra.perdedor) {
      definirTimeEstado(
        estado,
        regra.perdedor[0],
        regra.perdedor[1],
        perdedor
      );
    }
  });

  return avisos;
}

function montarPalpitesParaSalvar() {
  const estado =
  criarEstadoPalpites();

  gerarFase32DoPalpite(estado);

  const avisos =
  avancarMataMataDoPalpite(estado);

  const palpites =
  Object.values(estado)
  .filter(item =>
    temPalpiteCompleto(item) ||
    item.time_a !== item.jogo.time_a ||
    item.time_b !== item.jogo.time_b
  )
  .map(item => ({
    jogo_id: item.jogo_id,
    palpite_a: item.palpite_a,
    palpite_b: item.palpite_b,
    time_a: item.time_a,
    time_b: item.time_b,
    classificado: item.classificado
  }));

  return {
    palpites,
    avisos
  };
}

function validarPalpitesParaSalvar() {
  const estado =
  criarEstadoPalpites();

  gerarFase32DoPalpite(estado);

  const erros = [];

  Object.values(estado).forEach(item => {
    const jogoComecado =
    item.palpite_a !== "" ||
    item.palpite_b !== "" ||
    Boolean(item.classificado);

    if (!jogoComecado) {
      return;
    }

    if (
      item.palpite_a === "" ||
      item.palpite_b === ""
    ) {
      erros.push(
        "Jogo " + item.jogo_id +
        ": se preencher um lado do placar, preencha o outro tamb\u00e9m."
      );
      return;
    }

    if (
      valorPlacarInvalido(item.palpite_a) ||
      valorPlacarInvalido(item.palpite_b)
    ) {
      erros.push(
        "Jogo " + item.jogo_id +
        ": use apenas valores 0 ou maiores."
      );
      return;
    }

    if (
      item.fase !== "grupos" &&
      Number(item.palpite_a) === Number(item.palpite_b) &&
      !item.classificado
    ) {
      erros.push(
        "Jogo " + item.jogo_id +
        ": empate no mata-mata precisa ter classificado."
      );
    }
  });

  return erros;
}

function atualizarChaveamentoEmMemoria() {
  const estado =
  criarEstadoPalpites();

  gerarFase32DoPalpite(estado);
  avancarMataMataDoPalpite(estado);

  Object.values(estado).forEach(item => {
    palpitesUsuario[item.jogo_id] = {
      jogo_id: item.jogo_id,
      palpite_a: item.palpite_a,
      palpite_b: item.palpite_b,
      time_a: item.time_a,
      time_b: item.time_b,
      classificado: item.classificado
    };
  });
}

async function salvarTodosPalpites() {
  if (sistemaTravado) {
    mostrarFeedback(
      "Bol\u00e3o travado. N\u00e3o \u00e9 mais poss\u00edvel alterar palpites.",
      "erro"
    );
    return;
  }

  const botao =
  document.getElementById("botaoSalvarPalpites");

  const faltantes =
  atualizarAvisoPalpites();

  const errosValidacao =
  validarPalpitesParaSalvar();

  if (errosValidacao.length > 0) {
    mostrarFeedback(
      "Corrija os campos destacados antes de salvar.",
      "erro"
    );
    alert(
      "Corrija os palpites antes de salvar:\n\n" +
      errosValidacao.join("\n")
    );
    return;
  }

  const resultado =
  montarPalpitesParaSalvar();

  const palpites =
  resultado.palpites;

  if (palpites.length === 0) {
    mostrarFeedback(
      "Nenhum palpite preenchido para salvar.",
      "erro"
    );
    return;
  }

  definirLoadingBotao(
    botao,
    true,
    "Salvando...",
    "Salvar Palpites"
  );

  let dados;

  try {
    dados =
    await chamarApiProtegida(
      "salvarPalpitesLote",
      {
        usuario_id: usuario.id,
        palpites: JSON.stringify(palpites)
      }
    );
  } catch (erro) {
    mostrarFeedback(erro.message, "erro");
    definirLoadingBotao(
      botao,
      false,
      "Salvando...",
      "Salvar Palpites"
    );
    return;
  }

  definirLoadingBotao(
    botao,
    false,
    "Salvando...",
    "Salvar Palpites"
  );

  mostrarFeedback(
    dados.mensagem ||
    "Palpites salvos com sucesso.",
    "sucesso"
  );

  if (faltantes.length > 0) {
    mostrarFeedback(
      "Faltam " +
      faltantes.length +
      " jogos para completar sua aposta.",
      "aviso"
    );
  }

  if (resultado.avisos.length > 0) {
    alert(resultado.avisos.join("\n"));
  }

  await carregarPalpites();
  await carregarJogos();
}

async function salvarTodosResultados() {
  registrarResultadosOficiaisEmEdicao();

  const jogosParaSalvar =
  jogosVisiveis
  .map(jogo => {
    const inputA =
    document.getElementById(
      "a_" + jogo.jogo_id
    );

    const inputB =
    document.getElementById(
      "b_" + jogo.jogo_id
    );

    return {
      jogo,
      golA: inputA ? inputA.value : "",
      golB: inputB ? inputB.value : ""
    };
  })
  .filter(item =>
    item.golA !== "" &&
    item.golB !== ""
  );

  const resultadoInvalido =
  jogosParaSalvar.find(item =>
    valorPlacarInvalido(item.golA) ||
    valorPlacarInvalido(item.golB)
  );

  if (resultadoInvalido) {
    alert(
      "O jogo " + resultadoInvalido.jogo.jogo_id +
      " tem placar oficial inv\u00e1lido. Use apenas valores 0 ou maiores."
    );
    atualizarBotaoSalvarResultados(
      "Salvar Resultados Oficiais",
      false
    );
    return;
  }

  const placarAlto =
  jogosParaSalvar.find(item =>
    placarPareceAbsurdo(item.golA, item.golB)
  );

  if (
    placarAlto &&
    !window.confirm(
      "O jogo " + placarAlto.jogo.jogo_id +
      " tem placar " + placarAlto.golA + " x " + placarAlto.golB +
      ". Confirmar salvamento dos resultados mesmo assim?"
    )
  ) {
    atualizarBotaoSalvarResultados(
      "Salvar Resultados Oficiais",
      false
    );
    return;
  }

  atualizarBotaoSalvarResultados(
    "Salvando 0/" + jogosParaSalvar.length,
    true
  );

  const resultadoSalvamento =
  await salvarResultadosEmParalelo(
    jogosParaSalvar
  ).catch(erro => {
    atualizarBotaoSalvarResultados(
      "Salvar Resultados Oficiais",
      false
    );

    alert(erro.message);

    return {
      totalSalvos: 0,
      falhas: jogosParaSalvar.map(item =>
        item.jogo.jogo_id
      )
    };
  });

  const totalSalvos =
  resultadoSalvamento.totalSalvos;

  const falhas =
  resultadoSalvamento.falhas;

  const estado =
  criarEstadoResultadosOficiais();

  const faltantes =
  obterJogosGrupoFaltantes(estado);

  let mensagemFase32 = "";
  let faltantesServidor = null;

  if (
    falhas.length === 0 &&
    faltantes.length === 0
  ) {
    try {
      const dadosFase32 =
      await chamarApiProtegida(
        "gerarFase32"
      );

      mensagemFase32 =
      "\n" + (
        dadosFase32.mensagem ||
        "Fase de 32 gerada automaticamente."
      );
    } catch (erro) {
      mensagemFase32 =
      "\nResultados salvos, mas n\u00e3o foi poss\u00edvel gerar a fase de 32 agora.";
    }
  }

  if (falhas.length === 0) {
    try {
      const dadosConferencia = await chamarApiPublica(
        API + "?acao=listarJogos"
      );

      faltantesServidor =
      obterJogosGrupoFaltantesDaApi(
        dadosConferencia.jogos || []
      );
    } catch (erro) {
      faltantesServidor = null;
    }
  }

  const complemento =
  falhas.length > 0
  ? "\nFalha ao salvar os jogos: " +
    falhas.join(", ") +
    ". O rascunho ficou guardado nesta tela."
  : faltantesServidor &&
    faltantesServidor.length > 0
  ? "\nA tela foi salva parcialmente no servidor. Ainda faltam no banco: " +
    faltantesServidor
    .map(jogo => jogo.jogo_id)
    .join(", ") +
    ". O rascunho ficou guardado nesta tela."
  : faltantes.length === 0
  ? "\nFase de grupos completa." +
    mensagemFase32
  : "\nAinda faltam " + faltantes.length +
    " resultados da fase de grupos: " +
    faltantes.map(item => item.jogo_id).join(", ");

  atualizarBotaoSalvarResultados(
    "Salvar Resultados Oficiais",
    false
  );

  alert(
    totalSalvos + " resultados oficiais salvos" +
    complemento
  );

  mostrarFeedback(
    "Resultado oficial atualizado.",
    falhas.length > 0 ? "aviso" : "sucesso"
  );

  if (
    falhas.length === 0 &&
    faltantes.length === 0 &&
    faltantesServidor &&
    faltantesServidor.length === 0
  ) {
    localStorage.removeItem(
      CHAVE_RASCUNHO_RESULTADOS_OFICIAIS
    );
    resultadosOficiaisEmEdicao = {};
  }

  await carregarJogos();
  await carregarRanking();
}



async function iniciar() {
  await verificarTrava();

  atualizarLinkParticipantes();
  renderizarPainelConta();
  renderizarAcoesAdmin();

  renderizarBarraSalvarPalpites();

  if (!usuarioPrecisaDefinirCredenciais()) {
    await carregarPalpites();
  }

  await carregarJogos();

  await carregarDadosAdmin();

  if (usuarioPrecisaDefinirCredenciais()) {
    abrirConfiguracoes();
  }

  await carregarRanking();

  await carregarPremiacao();

  renderizarDashboardAdmin();
}

iniciar();

if (usuario.admin === "SIM") {
  window.addEventListener(
    "beforeunload",
    registrarResultadosOficiaisEmEdicao
  );
}
