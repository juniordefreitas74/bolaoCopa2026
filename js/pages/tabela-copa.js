function obterJogosGrupoSemResultado(jogos) {
  return jogos.filter(jogo =>
    jogo.fase === "grupos" &&
    !temResultado(jogo)
  );
}

function renderizarPlacar(jogo) {
  if (!temResultado(jogo)) {
    return `
      <span class="placar-oficial pendente">
        Aguardando
      </span>
    `;
  }

  return `
    <span class="placar-oficial-wrap">
      <span class="placar-oficial confirmado">
        ${jogo.gol_a} x ${jogo.gol_b}
      </span>
      ${renderizarPlacarPenaltis(jogo)}
    </span>
  `;
}

function temPenaltis(jogo) {
  return jogo.fase !== "grupos" &&
    String(jogo.gol_a) === String(jogo.gol_b) &&
    jogo.penalti_a !== "" &&
    jogo.penalti_a !== null &&
    jogo.penalti_a !== undefined &&
    jogo.penalti_b !== "" &&
    jogo.penalti_b !== null &&
    jogo.penalti_b !== undefined;
}

function renderizarPlacarPenaltis(jogo) {
  if (!temPenaltis(jogo)) {
    return "";
  }

  return `
    <small class="placar-penaltis-tabela">
      <span>P&ecirc;naltis</span>
      <strong>${jogo.penalti_a} x ${jogo.penalti_b}</strong>
    </small>
  `;
}

function criarGrupos(jogos) {
  const grupos = {};

  jogos
    .filter(jogo => jogo.fase === "grupos")
    .forEach(jogo => {
      if (!grupos[jogo.grupo]) {
        grupos[jogo.grupo] = [];
      }

      [jogo.time_a, jogo.time_b].forEach(time => {
        if (time && !grupos[jogo.grupo].includes(time)) {
          grupos[jogo.grupo].push(time);
        }
      });
    });

  const letras = Object.keys(grupos).sort();

  if (letras.length === 0) {
    return "Nenhum grupo encontrado.";
  }

  return letras.map(letra => `
    <article class="grupo-lateral">
      <h3>Grupo ${letra}</h3>
      <ul>
        ${grupos[letra].map(time => `
          <li>${renderizarTime(time)}</li>
        `).join("")}
      </ul>
    </article>
  `).join("");
}

function criarMapaGrupos(jogos) {
  const grupos = {};

  jogos
    .filter(jogo => jogo.fase === "grupos")
    .forEach(jogo => {
      if (!grupos[jogo.grupo]) {
        grupos[jogo.grupo] = {
          times: [],
          jogos: []
        };
      }

      grupos[jogo.grupo].jogos.push(jogo);

      [jogo.time_a, jogo.time_b].forEach(time => {
        if (time && !grupos[jogo.grupo].times.includes(time)) {
          grupos[jogo.grupo].times.push(time);
        }
      });
    });

  return grupos;
}

function separarPorFase(jogos) {
  const fases = {};

  ordemFases.forEach(fase => {
    fases[fase] = [];
  });

  jogos.forEach(jogo => {
    if (!fases[jogo.fase]) {
      fases[jogo.fase] = [];
    }

    fases[jogo.fase].push(jogo);
  });

  return fases;
}

function criarClassificacaoGrupo(grupo) {
  const tabela = {};

  grupo.times.forEach(time => {
    tabela[time] = {
      time,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0,
      aproveitamento: 0
    };
  });

  grupo.jogos.forEach(jogo => {
    if (!temResultado(jogo)) {
      return;
    }

    const golsA = Number(jogo.gol_a);
    const golsB = Number(jogo.gol_b);
    const timeA = tabela[jogo.time_a];
    const timeB = tabela[jogo.time_b];

    if (!timeA || !timeB) {
      return;
    }

    timeA.jogos++;
    timeB.jogos++;

    timeA.golsPro += golsA;
    timeA.golsContra += golsB;
    timeB.golsPro += golsB;
    timeB.golsContra += golsA;

    if (golsA > golsB) {
      timeA.vitorias++;
      timeA.pontos += 3;
      timeB.derrotas++;
    } else if (golsB > golsA) {
      timeB.vitorias++;
      timeB.pontos += 3;
      timeA.derrotas++;
    } else {
      timeA.empates++;
      timeB.empates++;
      timeA.pontos++;
      timeB.pontos++;
    }
  });

  return Object.values(tabela)
    .map(item => {
      item.saldo = item.golsPro - item.golsContra;
      item.aproveitamento = item.jogos === 0
        ? 0
        : Math.round((item.pontos / (item.jogos * 3)) * 100);

      return item;
    })
    .sort((a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldo - a.saldo ||
      b.golsPro - a.golsPro ||
      a.time.localeCompare(b.time)
    );
}

function ordenarJogos(jogos) {
  return [...jogos].sort((a, b) => {
    const dataA = `${obterChaveData(a.data)} ${formatarHora(a.hora)}`;
    const dataB = `${obterChaveData(b.data)} ${formatarHora(b.hora)}`;

    return dataA.localeCompare(dataB);
  });
}

function criarRodadasGrupo(jogos) {
  const jogosOrdenados = ordenarJogos(jogos);
  const rodadas = [];

  jogosOrdenados.forEach((jogo, index) => {
    const rodada = Math.floor(index / 2);

    if (!rodadas[rodada]) {
      rodadas[rodada] = [];
    }

    rodadas[rodada].push(jogo);
  });

  return rodadas;
}

function criarTabelaClassificacao(classificacao) {
  return `
    <div class="tabela-classificacao-wrap">
      <table class="tabela-classificacao-copa">
        <thead>
          <tr>
            <th>Classifica&ccedil;&atilde;o</th>
            <th>P</th>
            <th>J</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GP</th>
            <th>GC</th>
            <th>SG</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${classificacao.map((item, index) => `
            <tr>
              <td>
                <span class="posicao-classificacao">${index + 1}</span>
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
              <td>${item.aproveitamento}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function criarJogosGrupo(jogos) {
  const rodadas = criarRodadasGrupo(jogos);

  return `
    <div class="rodadas-grupo">
      ${rodadas.map((rodada, index) => `
        <section class="rodada-grupo">
          <h4>${index + 1}&ordf; rodada</h4>

          ${rodada.map(jogo => `
            <article class="jogo-rodada">
              <div class="meta-rodada">
                <span>${formatarData(jogo.data)}</span>
                <span>${formatarHora(jogo.hora)}</span>
              </div>

              <div class="linha-jogo-rodada">
                <span>${renderizarTime(jogo.time_a)}</span>
                ${renderizarPlacar(jogo)}
                <span>${renderizarTime(jogo.time_b)}</span>
              </div>
            </article>
          `).join("")}
        </section>
      `).join("")}
    </div>
  `;
}

function criarTabelaJogos(jogos) {
  const grupos = criarMapaGrupos(jogos);
  const letras = Object.keys(grupos).sort();

  if (letras.length === 0) {
    return "Nenhum jogo de grupo encontrado.";
  }

  return letras.map(letra => {
    const grupo = grupos[letra];
    const classificacao = criarClassificacaoGrupo(grupo);

    return `
      <section class="grupo-tabela-oficial">
        <h3>Grupo ${letra}</h3>

        <div class="grupo-tabela-layout">
          ${criarTabelaClassificacao(classificacao)}
          ${criarJogosGrupo(grupo.jogos)}
        </div>
      </section>
    `;
  }).join("");
}

function clonarJogos(jogos) {
  return jogos.map(jogo => ({ ...jogo }));
}

function aplicarRascunhoResultadosOficiais(jogos) {
  const rascunho = JSON.parse(
    localStorage.getItem(
      CHAVE_RASCUNHO_RESULTADOS_OFICIAIS
    ) || "{}"
  );
  const penaltis = JSON.parse(
    localStorage.getItem(
      CHAVE_RASCUNHO_PENALTIS_OFICIAIS
    ) || "{}"
  );

  if (
    Object.keys(rascunho).length === 0 &&
    Object.keys(penaltis).length === 0
  ) {
    return jogos;
  }

  return jogos.map(jogo => {
    const editado = rascunho[jogo.jogo_id];
    const penaltisJogo =
    penaltis[jogo.jogo_id] || {};

    if (!editado) {
      return {
        ...jogo,
        penalti_a: penaltisJogo.penalti_a || "",
        penalti_b: penaltisJogo.penalti_b || ""
      };
    }

    return {
      ...jogo,
      gol_a: editado.gol_a,
      gol_b: editado.gol_b,
      penalti_a: penaltisJogo.penalti_a || "",
      penalti_b: penaltisJogo.penalti_b || ""
    };
  });
}


function aplicarFase32Calculada(jogos) {
  const grupos = criarMapaGrupos(jogos);
  const classificados = {};
  const terceiros = [];

  for (const letra in grupos) {
    const classificacao =
    criarClassificacaoGrupo(grupos[letra]);

    if (
      classificacao.length < 4 ||
      classificacao.some(time => time.jogos < 3)
    ) {
      return jogos;
    }

    classificados["1" + letra] =
    classificacao[0].time;

    classificados["2" + letra] =
    classificacao[1].time;

    terceiros.push({
      grupo: letra,
      time: classificacao[2].time,
      pontos: classificacao[2].pontos,
      vitorias: classificacao[2].vitorias,
      saldo: classificacao[2].saldo,
      golsPro: classificacao[2].golsPro
    });
  }

  const terceirosClassificados =
  terceiros
    .sort((a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldo - a.saldo ||
      b.golsPro - a.golsPro ||
      a.time.localeCompare(b.time)
    )
    .slice(0, 8);

  terceirosClassificados.forEach(terceiro => {
    classificados["3" + terceiro.grupo] =
    terceiro.time;
  });

  const terceirosFifa =
  obterTerceirosFifa(terceirosClassificados);

  if (!terceirosFifa) {
    return jogos;
  }

  Object.keys(mapaFase32).forEach(jogoId => {
    const jogo =
    jogos.find(item =>
      String(item.jogo_id) === String(jogoId)
    );

    if (!jogo) {
      return;
    }

    const confronto = mapaFase32[jogoId];
    const colunaFifa =
    mapaColunasFifaTerceiros[jogoId];

    const codigoTerceiro =
    colunaFifa
      ? terceirosFifa[colunaFifa]
      : null;

    jogo.time_a =
    confronto[0].startsWith("3")
      ? classificados[codigoTerceiro] ||
        confronto[0]
      : resolverClassificado(
        confronto[0],
        { ...classificados }
      );

    jogo.time_b =
    confronto[1].startsWith("3")
      ? classificados[codigoTerceiro] ||
        confronto[1]
      : resolverClassificado(
        confronto[1],
        { ...classificados }
      );
  });

  return jogos;
}

function definirTimeJogo(jogos, jogoId, lado, time) {
  const jogo =
  jogos.find(item =>
    String(item.jogo_id) === String(jogoId)
  );

  if (!jogo) {
    return;
  }

  if (lado === "A") {
    jogo.time_a = time;
  }

  if (lado === "B") {
    jogo.time_b = time;
  }
}

function obterVencedorMataMata(jogo) {
  if (!temResultado(jogo)) {
    return "";
  }

  const golsA = Number(jogo.gol_a);
  const golsB = Number(jogo.gol_b);

  if (golsA > golsB) {
    return jogo.time_a;
  }

  if (golsB > golsA) {
    return jogo.time_b;
  }

  if (!temPenaltis(jogo)) {
    return "";
  }

  const penaltiA = Number(jogo.penalti_a);
  const penaltiB = Number(jogo.penalti_b);

  if (penaltiA > penaltiB) {
    return jogo.time_a;
  }

  if (penaltiB > penaltiA) {
    return jogo.time_b;
  }

  return "";
}

function aplicarAvancosMataMata(jogos) {
  ordemMataMata.forEach(jogoId => {
    const jogo =
    jogos.find(item =>
      String(item.jogo_id) === String(jogoId)
    );

    if (!jogo) {
      return;
    }

    const vencedor =
    obterVencedorMataMata(jogo);

    if (!vencedor) {
      return;
    }

    const perdedor =
    vencedor === jogo.time_a
      ? jogo.time_b
      : jogo.time_a;

    const regra =
    avancosMataMata[jogoId];

    if (!regra) {
      return;
    }

    if (regra.vencedor) {
      definirTimeJogo(
        jogos,
        regra.vencedor[0],
        regra.vencedor[1],
        vencedor
      );
    }

    if (regra.perdedor) {
      definirTimeJogo(
        jogos,
        regra.perdedor[0],
        regra.perdedor[1],
        perdedor
      );
    }
  });

  return jogos;
}

function obterIdFase(fase) {
  const mapa = {
    fase_32: "fase-32",
    oitavas: "fase-oitavas",
    quartas: "fase-quartas",
    semi: "fase-semi",
    terceiro_lugar: "fase-terceiro",
    final: "fase-final"
  };

  return mapa[fase] || fase;
}

function renderizarAtalhosTabela() {
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

function criarChaveamento(jogos) {
  const fases = separarPorFase(jogos);
  const fasesMataMata = ordemFases.filter(fase => fase !== "grupos");

  const html = fasesMataMata.map(fase => {
    const jogosDaFase = fases[fase];
    const classeGrade =
      fase === "fase_32"
        ? "grade-fase-32"
        : fase === "oitavas"
        ? "grade-oitavas"
        : fase === "quartas"
        ? "grade-quartas"
        : fase === "terceiro_lugar" ||
          fase === "final"
        ? "grade-decisao"
        : "grade-finais";

    if (!jogosDaFase || jogosDaFase.length === 0) {
      return "";
    }

    return `
      <section
        class="secao-fase secao-chaveamento fase-${fase}"
        id="${obterIdFase(fase)}"
      >
        <h3>${titulosFase[fase]}</h3>

        <div class="grade-chaveamento ${classeGrade}">
          ${jogosDaFase.map(jogo => `
            <article class="jogo-chaveamento">
              <div class="meta-tabela">
                <span>Jogo ${jogo.jogo_id}</span>
                <span>
                  ${formatarData(jogo.data)}
                  ${formatarHora(jogo.hora)}
                </span>
              </div>

              <div class="card-chaveamento-horizontal">
                <div class="linha-times-chaveamento">
                  <div class="time-chaveamento">
                    ${renderizarTime(jogo.time_a)}
                  </div>
                  <div class="time-chaveamento">
                    ${renderizarTime(jogo.time_b)}
                  </div>
                </div>

                <div class="linha-placar-chaveamento">
                  ${renderizarPlacar(jogo)}
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");

  if (!html.trim()) {
    return "O chaveamento ainda n&atilde;o foi carregado.";
  }

  return html;
}

async function carregarTabelaCopa() {
  const status = document.getElementById("statusTabela");

  try {
    const resposta = await fetch(API + "?acao=listarJogos");
    const dados = await resposta.json();
    const jogos =
      aplicarRascunhoResultadosOficiais(
        dados.jogos || []
      );
    const jogosComChaveamento =
      aplicarAvancosMataMata(
        aplicarFase32Calculada(
          clonarJogos(jogos)
        )
      );

    const atalhosTabela =
      document.getElementById(
        "atalhosTabelaCopa"
      );

    if (atalhosTabela) {
      atalhosTabela.innerHTML =
        renderizarAtalhosTabela();
    }

    document.getElementById("listaGrupos").innerHTML =
      criarGrupos(jogos);

    document.getElementById("tabelaJogos").innerHTML =
      criarTabelaJogos(jogos);

    document.getElementById("chaveamentoCopa").innerHTML =
      criarChaveamento(jogosComChaveamento);

    const faltantes =
      obterJogosGrupoSemResultado(jogos);

    status.innerHTML =
      faltantes.length === 0
        ? "Tabela atualizada com os resultados oficiais cadastrados pelo administrador."
        : "A fase de 32 aparece quando todos os resultados da fase de grupos estiverem salvos. Faltam: " +
          faltantes.map(jogo => jogo.jogo_id).join(", ");
  } catch (erro) {
    status.innerHTML =
      "N&atilde;o foi poss&iacute;vel carregar a tabela agora. Tente novamente em instantes.";
  }
}

carregarTabelaCopa();

window.addEventListener("storage", evento => {
  if (
    evento.key ===
    CHAVE_RASCUNHO_RESULTADOS_OFICIAIS ||
    evento.key ===
    CHAVE_RASCUNHO_PENALTIS_OFICIAIS
  ) {
    carregarTabelaCopa();
  }
});
