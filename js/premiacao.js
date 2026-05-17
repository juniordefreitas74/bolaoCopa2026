async function carregarPremiacao() {
  let dados;

  try {
    dados = await chamarApiPublica(
      API + "?acao=premiacao"
    );
  } catch (erro) {
    document.getElementById("premiacao").innerHTML = `
      <h2>Premia&ccedil;&atilde;o</h2>
      <div class="status-tabela">
        ${erro.message}
      </div>
    `;
    return;
  }

  resumoPremiacaoAtual = dados;

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

      <p class="premio-destaque premio-ouro">
        <span>💰 1\u00ba Lugar</span>
        <strong>
          R$ ${dados.premio1.toFixed(2)}
        </strong>
      </p>

      <p class="premio-destaque premio-prata">
        <span>💵 2\u00ba Lugar</span>
        <strong>
          R$ ${dados.premio2.toFixed(2)}
        </strong>
      </p>

      <p class="premio-destaque premio-bronze">
        <span>🪙 3\u00ba Lugar</span>
        <strong>
          R$ ${dados.premio3.toFixed(2)}
        </strong>
      </p>

    </div>
  `;

  document.getElementById(
    "premiacao"
  ).innerHTML = html;

  if (typeof atualizarResumoUsuario === "function") {
    atualizarResumoUsuario();
  }
}
