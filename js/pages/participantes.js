const usuarioLogado =
JSON.parse(localStorage.getItem("usuario") || "null");

const tokenSessao =
localStorage.getItem("sessaoToken");

const titulosFaseParticipantes = titulosFase;
const ordemFasesParticipantes = ordemFases;

let jogosParticipantes = [];
let participantesStatus = [];

if (!usuarioLogado || !tokenSessao) {
  window.location.href = "dashboard.html";
  throw new Error("Sess\u00e3o inv\u00e1lida");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function usuarioEhAdminLista(usuario) {
  return String(usuario.admin || "").toUpperCase() === "SIM" ||
    String(usuario.nome || "").trim().toLowerCase() === "administrador" ||
    String(usuario.login || "").trim().toLowerCase() === "admin";
}


async function carregarJogosParticipantes() {
  const dados =
  await chamarApiPublica(
    API + "?acao=listarJogos"
  );

  jogosParticipantes =
  (dados.jogos || [])
  .filter(jogo =>
    jogo.time_a &&
    jogo.time_b
  );
}

async function carregarDadosParticipantes() {
  const dados =
  await chamarApiProtegida("listarParticipantesStatus");

  if (dados.erro) {
    throw new Error(
      dados.mensagem ||
      "N\u00e3o foi poss\u00edvel carregar participantes"
    );
  }

  return {
    usuarios: (dados.usuarios || [])
      .filter(usuario =>
        usuario.admin !== "SIM"
      ),
    palpites: dados.palpites || []
  };
}

function criarMapaPalpites(palpites) {
  const mapa = {};

  palpites.forEach(palpite => {
    mapa[palpite.jogo_id] = palpite;
  });

  return mapa;
}

function palpitePreenchido(palpite) {
  if (!palpite) {
    return false;
  }

  const valorA =
  palpite.palpite_a;

  const valorB =
  palpite.palpite_b;

  return (
    valorA === 0 ||
    valorA === "0" ||
    Boolean(valorA)
  ) && (
    valorB === 0 ||
    valorB === "0" ||
    Boolean(valorB)
  );
}

function calcularStatusParticipante(usuario, palpites) {
  const mapa =
  criarMapaPalpites(palpites);

  const faltantes =
  jogosParticipantes.filter(jogo =>
    !palpitePreenchido(
      mapa[jogo.jogo_id]
    )
  );

  return {
    usuario,
    palpites,
    mapa,
    faltantes,
    totalJogos: jogosParticipantes.length,
    preenchidos: jogosParticipantes.length - faltantes.length
  };
}

function renderizarListaParticipantes() {
  const lista =
  document.getElementById("listaParticipantes");

  const status =
  document.getElementById("statusParticipantes");

  if (participantesStatus.length === 0) {
    status.innerText =
    "Nenhum participante cadastrado.";

    lista.innerHTML = "";
    return;
  }

  const completos =
  participantesStatus.filter(item =>
    item.faltantes.length === 0
  ).length;

  status.innerText =
  completos + " de " +
  participantesStatus.length +
  " participantes preencheram tudo.";

  lista.innerHTML =
  participantesStatus.map(item => {
    const completo =
    item.faltantes.length === 0;

    return `
      <article
        class="linha-participante-status ${completo ? "completo" : "pendente"}"
      >
        <button
          type="button"
          class="nome-participante-status"
          onclick="abrirPalpitesParticipante('${encodeURIComponent(item.usuario.id)}')"
        >
          ${escaparHtml(item.usuario.nome)}
        </button>

        <span class="resumo-participante-status">
          ${
            completo
            ? "Preencheu tudo"
            : "Faltam " + item.faltantes.length + " jogos"
          }
        </span>

        <span class="contador-participante-status">
          ${item.preenchidos}/${item.totalJogos}
        </span>
      </article>
    `;
  }).join("");
}

function agruparJogosPorFase() {
  const fases = {};

  ordemFasesParticipantes.forEach(fase => {
    fases[fase] = [];
  });

  jogosParticipantes.forEach(jogo => {
    if (!fases[jogo.fase]) {
      fases[jogo.fase] = [];
    }

    fases[jogo.fase].push(jogo);
  });

  return fases;
}

function formatarPalpite(palpite) {
  if (!palpitePreenchido(palpite)) {
    return `
      <span class="placar-oficial pendente">
        Pendente
      </span>
    `;
  }

  return `
    <span class="placar-oficial confirmado">
      ${escaparHtml(palpite.palpite_a)}
      x
      ${escaparHtml(palpite.palpite_b)}
    </span>
  `;
}

function abrirPalpitesParticipante(usuarioIdCodificado) {
  const usuarioId =
  decodeURIComponent(usuarioIdCodificado);

  const item =
  participantesStatus.find(status =>
    String(status.usuario.id) === String(usuarioId)
  );

  if (!item) {
    return;
  }

  const modal =
  document.getElementById("modalPalpitesParticipante");

  const titulo =
  document.getElementById("tituloPalpitesParticipante");

  const conteudo =
  document.getElementById("conteudoPalpitesParticipante");

  titulo.innerText =
  "Palpites de " + item.usuario.nome;

  const fases =
  agruparJogosPorFase();

  conteudo.innerHTML =
  ordemFasesParticipantes.map(fase => {
    const jogos =
    fases[fase] || [];

    if (jogos.length === 0) {
      return "";
    }

    return `
      <section class="fase-palpites-participante">
        <h3>${titulosFaseParticipantes[fase] || fase}</h3>

        <div class="lista-palpites-participante">
          ${jogos.map(jogo => {
            const palpite =
            item.mapa[jogo.jogo_id];

            return `
              <article class="jogo-palpite-readonly">
                <div class="meta-tabela">
                  <span>Jogo ${escaparHtml(jogo.jogo_id)}</span>
                  <span>${escaparHtml(jogo.data)} ${escaparHtml(jogo.hora || "")}</span>
                </div>

                <div class="linha-tabela-jogo">
                  <span class="time-tabela">
                    ${escaparHtml(palpite?.time_a || jogo.time_a)}
                  </span>

                  ${formatarPalpite(palpite)}

                  <span class="time-tabela">
                    ${escaparHtml(palpite?.time_b || jogo.time_b)}
                  </span>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }).join("");

  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
}

function fecharPalpitesParticipante() {
  const modal =
  document.getElementById("modalPalpitesParticipante");

  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
}

function definirLoadingBotao(botao, carregando, textoCarregando, textoNormal) {
  if (!botao) {
    return;
  }

  botao.disabled = carregando;
  botao.innerText =
  carregando ? textoCarregando : textoNormal;
}

async function carregarParticipantes() {
  const status =
  document.getElementById("statusParticipantes");

  const lista =
  document.getElementById("listaParticipantes");

  const botao =
  document.getElementById("botaoAtualizarParticipantes");

  definirLoadingBotao(
    botao,
    true,
    "Carregando...",
    "Atualizar"
  );

  status.innerText =
  "Carregando participantes...";

  lista.innerHTML = "";

  try {
    if (usuarioLogado.admin !== "SIM") {
      const respostaConfig =
      await chamarApiPublica(API + "?acao=config");

      if (
        !respostaConfig.config ||
        respostaConfig.config.participantes_liberado !== "SIM"
      ) {
        status.innerText =
        "A tela de participantes ainda est\u00e1 travada pelo administrador.";

        lista.innerHTML = "";
        return;
      }
    }

    await carregarJogosParticipantes();

    const dadosParticipantes =
    await carregarDadosParticipantes();

    const palpitesPorUsuario = {};

    dadosParticipantes.palpites.forEach(palpite => {
      const usuarioId =
      palpite.usuario_id;

      if (!palpitesPorUsuario[usuarioId]) {
        palpitesPorUsuario[usuarioId] = [];
      }

      palpitesPorUsuario[usuarioId].push(palpite);
    });

    const resultados =
    dadosParticipantes.usuarios
    .filter(usuario =>
      !usuarioEhAdminLista(usuario)
    )
    .map(usuario =>
      calcularStatusParticipante(
        usuario,
        palpitesPorUsuario[usuario.id] || []
      )
    );

    participantesStatus =
    resultados.sort((a, b) =>
      a.usuario.nome.localeCompare(
        b.usuario.nome,
        "pt-BR"
      )
    );

    renderizarListaParticipantes();
  } catch (erro) {
    status.innerText =
    erro.message ||
    "Erro ao carregar participantes.";
  } finally {
    definirLoadingBotao(
      botao,
      false,
      "Carregando...",
      "Atualizar"
    );
  }
}

carregarParticipantes();
