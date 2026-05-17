async function carregarRanking() {
  let dados;

  try {
    dados = await chamarApiPublica(
      API + "?acao=ranking"
    );
  } catch (erro) {
    document.getElementById("ranking").innerHTML = `
      <h2>Ranking Geral</h2>
      <div class="status-tabela">
        ${erro.message}
      </div>
    `;
    return;
  }

  const ranking =
  dados.ranking.filter(r =>
    r.usuario_id !== 1 &&
    String(r.nome).toLowerCase() !==
    "administrador"
  );

  resumoRankingAtual = ranking;

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

  ranking.forEach((r, index) => {
    const medalha =
    index == 0
    ? "🥇"
    : index == 1
    ? "🥈"
    : index == 2
    ? "🥉"
    : "";

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
          ${medalha || index + 1}
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

  if (typeof atualizarResumoUsuario === "function") {
    atualizarResumoUsuario();
  }
}
