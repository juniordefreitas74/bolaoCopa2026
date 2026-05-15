let sistemaTravado = false;
let jogosVisiveis = [];

const usuario = JSON.parse(
  localStorage.getItem("usuario")
);

if (!usuario) {
  window.location.href = "index.html";
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

const API =
"https://script.google.com/macros/s/AKfycby24_HOph3BjgLOtj1S1Wof0geLsE0uglpYIBgJTkMLogSei6hK0O5WhHyMep8-odn4/exec";

const bandeiras = {
  "México": "mx",
  "África do Sul": "za",
  "Coreia do Sul": "kr",
  "Tchéquia": "cz",
  "Canadá": "ca",
  "Catar": "qa",
  "Suíça": "ch",
  "Bósnia e Herzegovina": "ba",
  "Brasil": "br",
  "Haiti": "ht",
  "Marrocos": "ma",
  "Escócia": "gb-sct",
  "Estados Unidos": "us",
  "Paraguai": "py",
  "Austrália": "au",
  "Turquia": "tr",
  "Alemanha": "de",
  "Curaçao": "cw",
  "Costa do Marfim": "ci",
  "Equador": "ec",
  "Holanda": "nl",
  "Japão": "jp",
  "Suécia": "se",
  "Tunísia": "tn",
  "Bélgica": "be",
  "Egito": "eg",
  "Irã": "ir",
  "Nova Zelândia": "nz",
  "Espanha": "es",
  "Cabo Verde": "cv",
  "Arábia Saudita": "sa",
  "Uruguai": "uy",
  "França": "fr",
  "Senegal": "sn",
  "Iraque": "iq",
  "Noruega": "no",
  "Argentina": "ar",
  "Argélia": "dz",
  "Áustria": "at",
  "Jordânia": "jo",
  "Portugal": "pt",
  "Congo DR": "cd",
  "Uzbequistão": "uz",
  "Colômbia": "co",
  "Inglaterra": "gb-eng",
  "Croácia": "hr",
  "Gana": "gh",
  "Panamá": "pa"
};

function logout() {
  localStorage.removeItem("usuario");
  window.location.href = "index.html";
}

function renderizarTime(nome) {
  const codigo =
  bandeiras[nome];

  if (!codigo) {
    return nome;
  }

  return `
    <span class="time-com-bandeira">
      <img
        src="https://flagcdn.com/w40/${codigo}.png"
        alt="Bandeira de ${nome}"
      >
      <span>${nome}</span>
    </span>
  `;
}

function renderizarAcoesAdmin() {
  const area = document.getElementById("acoesAdmin");

  if (!area) {
    return;
  }

  if (usuario.admin === "SIM") {
    area.innerHTML = `
      <button onclick="salvarTodosResultados()" class="btn-admin">
        Salvar Resultados Oficiais
      </button>

      <button onclick="gerarFase32()">
        Gerar Fase de 32
      </button>
    `;
  } else {
    area.innerHTML = "";
  }
}

async function verificarTrava() {
  const resposta = await fetch(
    API + "?acao=config"
  );

  const dados = await resposta.json();

  const dataTrava = new Date(
    dados.config.trava_palpites
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

function formatarData(dataISO) {
  const data = new Date(dataISO);

  return data.toLocaleDateString(
    "pt-BR"
  );
}

function formatarHora(horaISO) {
  if (!horaISO) {
    return "";
  }

  if (
    typeof horaISO === "string" &&
    horaISO.includes(":") &&
    !horaISO.includes("T")
  ) {
    return horaISO.slice(0, 5);
  }

  const hora = new Date(horaISO);

  return hora.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function obterChaveData(dataISO) {
  const data = new Date(dataISO);

  return data.toISOString().slice(0, 10);
}

async function carregarJogos() {
  const resposta = await fetch(
    API + "?acao=listarJogos"
  );

  const dados = await resposta.json();

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

  let html = `
    <h2>Jogos</h2>
  `;

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
      <div class="secao-fase ${classeFase}">
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
        const valorA =
        usuario.admin === "SIM"
        ? jogo.gol_a || ""
        : "";

        const valorB =
        usuario.admin === "SIM"
        ? jogo.gol_b || ""
        : "";

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
              <span class="time-jogo time-a">
                ${renderizarTime(jogo.time_a)}
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
              >

              <span class="time-jogo time-b">
                ${renderizarTime(jogo.time_b)}
              </span>
            </div>

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

  if (
    usuario.admin !== "SIM" &&
    !sistemaTravado
  ) {
    html += `
      <button onclick="salvarTodosPalpites()">
        Salvar Todos os Palpites
      </button>
    `;
  }

  document.getElementById(
    "areaJogos"
  ).innerHTML = html;
}

async function carregarPalpites() {
  if (usuario.admin === "SIM") {
    return;
  }

  const resposta = await fetch(
    API +
    "?acao=listarPalpites" +
    "&usuario_id=" + usuario.id
  );

  const dados = await resposta.json();

  dados.palpites.forEach(p => {
    const inputA =
    document.getElementById(
      "a_" + p.jogo_id
    );

    const inputB =
    document.getElementById(
      "b_" + p.jogo_id
    );

    if (inputA) {
      inputA.value = p.palpite_a;
    }

    if (inputB) {
      inputB.value = p.palpite_b;
    }
  });
}

async function salvarTodosPalpites() {
  let totalSalvos = 0;

  for (const jogo of jogosVisiveis) {
    const palpiteA =
    document.getElementById(
      "a_" + jogo.jogo_id
    ).value;

    const palpiteB =
    document.getElementById(
      "b_" + jogo.jogo_id
    ).value;

    if (palpiteA === "" || palpiteB === "") {
      continue;
    }

    await fetch(
      API +
      "?acao=salvarPalpite" +
      "&usuario_id=" + usuario.id +
      "&jogo_id=" + jogo.jogo_id +
      "&palpite_a=" + encodeURIComponent(palpiteA) +
      "&palpite_b=" + encodeURIComponent(palpiteB)
    );

    totalSalvos++;
  }

  alert(
    totalSalvos + " palpites salvos"
  );
}

async function salvarTodosResultados() {
  let totalSalvos = 0;

  for (const jogo of jogosVisiveis) {
    const golA =
    document.getElementById(
      "a_" + jogo.jogo_id
    ).value;

    const golB =
    document.getElementById(
      "b_" + jogo.jogo_id
    ).value;

    if (golA === "" || golB === "") {
      continue;
    }

    await fetch(
      API +
      "?acao=salvarResultado" +
      "&jogo_id=" + jogo.jogo_id +
      "&gol_a=" + encodeURIComponent(golA) +
      "&gol_b=" + encodeURIComponent(golB)
    );

    totalSalvos++;
  }

  alert(
    totalSalvos + " resultados oficiais salvos"
  );

  await carregarJogos();
  await carregarRanking();
}

async function carregarRanking() {
  const resposta = await fetch(
    API + "?acao=ranking"
  );

  const dados = await resposta.json();

  let html = `
    <h2>
      Ranking Geral
    </h2>

    <table class="tabela-ranking">

      <tr>
        <th>#</th>
        <th>Participante</th>
        <th>Pontos</th>
      </tr>
  `;

  dados.ranking.forEach((r, index) => {
    html += `
      <tr class="${
        index == 0
        ?
        "top1"
        :
        index == 1
        ?
        "top2"
        :
        index == 2
        ?
        "top3"
        :
        ""
      }">

        <td>
          ${index + 1}
        </td>

        <td>
          ${r.nome}
        </td>

        <td>
          ${r.pontos}
        </td>

      </tr>
    `;
  });

  html += `
    </table>
  `;

  document.getElementById(
    "ranking"
  ).innerHTML = html;
}

async function carregarPremiacao() {
  const resposta = await fetch(
    API + "?acao=premiacao"
  );

  const dados = await resposta.json();

  let detalhesAdmin = "";

  if (usuario.admin === "SIM") {
    detalhesAdmin = `
      <p>
        Participantes:
        <strong>
          ${dados.totalParticipantes}
        </strong>
      </p>

      <p>
        Total arrecadado:
        <strong>
          R$ ${dados.totalArrecadado.toFixed(2)}
        </strong>
      </p>

      <p>
        Taxa da casa:
        <strong>
          R$ ${dados.valorCasa.toFixed(2)}
        </strong>
      </p>

      <p>
        Total para pr\u00eamios:
        <strong>
          R$ ${dados.premioTotal.toFixed(2)}
        </strong>
      </p>

      <hr>
    `;
  }

  let html = `
    <h2>
      Premia\u00e7\u00e3o
    </h2>

    <div class="box-premio">

      ${detalhesAdmin}

      <p>
        1\u00ba Lugar:
        <strong>
          R$ ${dados.premio1.toFixed(2)}
        </strong>
      </p>

      <p>
        2\u00ba Lugar:
        <strong>
          R$ ${dados.premio2.toFixed(2)}
        </strong>
      </p>

      <p>
        3\u00ba Lugar:
        <strong>
          R$ ${dados.premio3.toFixed(2)}
        </strong>
      </p>

    </div>
  `;

  document.getElementById(
    "premiacao"
  ).innerHTML = html;
}

async function gerarFase32() {
  const resposta = await fetch(
    API + "?acao=gerarFase32"
  );

  const dados = await resposta.json();

  alert(dados.mensagem);

  await carregarJogos();
}

async function iniciar() {
  renderizarAcoesAdmin();

  await verificarTrava();

  await carregarJogos();

  await carregarPalpites();

  await carregarRanking();

  await carregarPremiacao();
}

iniciar();
