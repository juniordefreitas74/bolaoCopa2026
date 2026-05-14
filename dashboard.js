const usuario = JSON.parse(
  localStorage.getItem("usuario")
);

if (!usuario) {

  window.location.href =
  "index.html";

}

document.getElementById("titulo")
.innerText =
"Olá " + usuario.nome;

if (usuario.admin === "SIM") {

  document.getElementById("tipo")
  .innerHTML = `

    <h2>
      Painel Administrador
    </h2>

  `;

} else {

  document.getElementById("tipo")
  .innerHTML = `

    <h2>
      Painel Participante
    </h2>

  `;

}

function logout() {

  localStorage.removeItem(
    "usuario"
  );

  window.location.href =
  "index.html";

}

const API =
"https://script.google.com/macros/s/AKfycby24_HOph3BjgLOtj1S1Wof0geLsE0uglpYIBgJTkMLogSei6hK0O5WhHyMep8-odn4/exec";

async function carregarJogos() {

  const resposta =
  await fetch(
    API + "?acao=listarJogos"
  );

  const dados =
  await resposta.json();

  let html = `
    <h2>Jogos</h2>
  `;

  dados.jogos.forEach(jogo => {

    html += `

      <div class="card-jogo">

        <div>
          ${jogo.data}
          ${jogo.hora}
        </div>

        <div class="linha-jogo">

        <span>
            ${jogo.time_a}
        </span>

        <input
            type="number"
            min="0"
            id="a_${jogo.jogo_id}"
            class="input-gol"
        >

        <span>X</span>

        <input
            type="number"
            min="0"
            id="b_${jogo.jogo_id}"
            class="input-gol"
        >

        <span>
            ${jogo.time_b}
        </span>

        </div>

        <button
        onclick="salvarPalpite(${jogo.jogo_id})"
        >
        Salvar Palpite
        </button>

        <small>
          Grupo ${jogo.grupo}
        </small>

      </div>

    `;

  });

  document.getElementById(
    "areaJogos"
  ).innerHTML = html;

}

carregarJogos();
async function salvarPalpite(jogo_id) {

  const palpite_a =
  document.getElementById(
    "a_" + jogo_id
  ).value;

  const palpite_b =
  document.getElementById(
    "b_" + jogo_id
  ).value;

  const url =

    API +

    "?acao=salvarPalpite" +

    "&usuario_id=" + usuario.id +

    "&jogo_id=" + jogo_id +

    "&palpite_a=" + palpite_a +

    "&palpite_b=" + palpite_b;

  const resposta =
  await fetch(url);

  const dados =
  await resposta.json();

  alert(dados.mensagem);

}