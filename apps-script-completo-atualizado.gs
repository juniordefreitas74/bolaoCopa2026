const TEMPO_SESSAO_HORAS = 12;

function doGet(e) {
  const acao = e.parameter.acao;

  if (acao === "listarJogos") {
    return listarJogos();
  }

  if (acao === "config") {
    return carregarConfig();
  }

  if (acao === "ranking") {
    return ranking();
  }

  if (acao === "premiacao") {
    return premiacao();
  }

  return resposta({
    erro: true,
    mensagem: "Ação inválida"
  });
}

function doPost(e) {
  const acao = e.parameter.acao;

  try {
    if (acao === "login") {
      return login(e);
    }

    const sessao = exigirSessao(e.parameter);

    if (acao === "listarPalpites") {
      if (
        String(e.parameter.usuario_id) !== String(sessao.usuario_id) &&
        !usuarioEhAdmin(sessao.usuario_id)
      ) {
        return resposta({ erro: true, mensagem: "Acesso negado" });
      }

      return listarPalpites(e);
    }

    if (acao === "salvarPalpite") {
      if (String(e.parameter.usuario_id) !== String(sessao.usuario_id)) {
        return resposta({ erro: true, mensagem: "Acesso negado" });
      }

      return salvarPalpite(e);
    }

    if (acao === "salvarPalpitesLote") {
      if (String(e.parameter.usuario_id) !== String(sessao.usuario_id)) {
        return resposta({ erro: true, mensagem: "Acesso negado" });
      }

      return salvarPalpitesLote(e);
    }

    if (acao === "salvarResultado") {
      if (!usuarioEhAdmin(sessao.usuario_id)) {
        return resposta({ erro: true, mensagem: "Apenas administrador" });
      }

      return salvarResultado(e, sessao);
    }

    if (acao === "gerarFase32") {
      if (!usuarioEhAdmin(sessao.usuario_id)) {
        return resposta({ erro: true, mensagem: "Apenas administrador" });
      }

      return gerarFase32();
    }

    if (acao === "listarUsuariosAdmin") {
      return listarUsuariosAdmin(sessao);
    }

    if (acao === "criarUsuario") {
      return criarUsuario(e, sessao);
    }

    if (acao === "alterarStatusUsuario") {
      return alterarStatusUsuario(e, sessao);
    }

    if (acao === "excluirUsuario") {
      return excluirUsuario(e, sessao);
    }

    if (acao === "resetarAcessoUsuario") {
      return resetarAcessoUsuario(e, sessao);
    }

    if (acao === "marcarPagamentoUsuario") {
      return marcarPagamentoUsuario(e, sessao);
    }

    if (acao === "atualizarConfig") {
      return atualizarConfig(e, sessao);
    }

    if (acao === "listarParticipantesStatus") {
      return listarParticipantesStatus(e, sessao);
    }

    if (acao === "definirCredenciaisPermanentes") {
      return definirCredenciaisPermanentes(e, sessao);
    }

    if (acao === "alterarLogin") {
      return alterarLogin(e, sessao);
    }

    if (acao === "alterarSenha") {
      return alterarSenha(e, sessao);
    }

    return resposta({
      erro: true,
      mensagem: "Ação inválida"
    });
  } catch (erro) {
    if (erro.message === "SESSAO_INVALIDA") {
      return resposta({
        erro: true,
        sessaoInvalida: true,
        mensagem: "Sessão expirada. Entre novamente."
      });
    }

    return resposta({
      erro: true,
      mensagem: "Erro interno: " + erro.message
    });
  }
}

function resposta(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function obterPlanilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function criarMapaCabecalho(cabecalho) {
  const mapa = {};

  cabecalho.forEach((coluna, index) => {
    mapa[String(coluna).trim()] = index;
  });

  return mapa;
}

function garantirColuna(aba, cabecalho, nome) {
  if (cabecalho[nome] !== undefined) {
    return cabecalho[nome];
  }

  const coluna = Object.keys(cabecalho).length;
  aba.getRange(1, coluna + 1).setValue(nome);
  cabecalho[nome] = coluna;

  return coluna;
}

function valorPreenchido(valor) {
  return valor === 0 || valor === "0" || Boolean(valor);
}

function placarInvalido(valor) {
  if (!valorPreenchido(valor)) {
    return true;
  }

  return Number(valor) < 0 || Number.isNaN(Number(valor));
}

function login(e) {
  const loginDigitado = String(e.parameter.login || "").trim().toLowerCase();
  const senhaDigitada = String(e.parameter.senha || "");

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const usuario = {
      id: linha[0],
      nome: linha[1],
      login: String(linha[2] || "").trim().toLowerCase(),
      admin: linha[4],
      ativo: linha[5],
      senhaHash: linha[6],
      senhaSalt: linha[7],
      trocaObrigatoria: linha[8],
      loginAlterado: linha[9]
    };

    if (
      usuario.login === loginDigitado &&
      usuario.ativo === "SIM" &&
      usuario.senhaHash &&
      gerarHashSenha(senhaDigitada, usuario.senhaSalt) === usuario.senhaHash
    ) {
      return resposta({
        erro: false,
        token: criarTokenSessao(usuario.id),
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          admin: usuario.admin,
          trocaObrigatoria: usuario.trocaObrigatoria,
          loginAlterado: usuario.loginAlterado
        }
      });
    }
  }

  return resposta({
    erro: true,
    mensagem: "Login inválido"
  });
}

function criarTokenSessao(usuarioId) {
  const aba = obterOuCriarAbaSessoes();
  const agora = new Date();
  const expiraEm = new Date(
    agora.getTime() + TEMPO_SESSAO_HORAS * 60 * 60 * 1000
  );
  const token = Utilities.getUuid() + "-" + Utilities.getUuid();

  aba.appendRow([
    token,
    usuarioId,
    agora,
    expiraEm,
    "SIM"
  ]);

  return token;
}

function exigirSessao(params) {
  const sessao = validarSessao(params.token);

  if (!sessao) {
    throw new Error("SESSAO_INVALIDA");
  }

  return sessao;
}

function validarSessao(token) {
  if (!token) {
    return null;
  }

  const aba = obterOuCriarAbaSessoes();
  const valores = aba.getDataRange().getValues();
  const agora = new Date();

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (
      linha[0] === token &&
      linha[4] === "SIM" &&
      new Date(linha[3]).getTime() > agora.getTime()
    ) {
      return {
        usuario_id: linha[1]
      };
    }
  }

  return null;
}

function obterOuCriarAbaSessoes() {
  const planilha = obterPlanilha();
  let aba = planilha.getSheetByName("sessoes");

  if (!aba) {
    aba = planilha.insertSheet("sessoes");
    aba.appendRow([
      "token",
      "usuario_id",
      "criado_em",
      "expira_em",
      "ativo"
    ]);
  }

  return aba;
}

function usuarioEhAdmin(usuarioId) {
  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(usuarioId)) {
      return valores[i][4] === "SIM";
    }
  }

  return false;
}

function gerarSalt() {
  return Utilities.getUuid();
}

function gerarHashSenha(senha, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + ":" + String(senha),
    Utilities.Charset.UTF_8
  );

  return bytes.map(byte => {
    const valor = byte < 0 ? byte + 256 : byte;
    return ("0" + valor.toString(16)).slice(-2);
  }).join("");
}

function migrarSenhaTextoParaHash() {
  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  aba.getRange(1, 7).setValue("senha_hash");
  aba.getRange(1, 8).setValue("senha_salt");

  for (let i = 1; i < valores.length; i++) {
    const senhaTexto = valores[i][3];
    const hashAtual = valores[i][6];

    if (!senhaTexto || hashAtual) {
      continue;
    }

    const salt = gerarSalt();
    const hash = gerarHashSenha(senhaTexto, salt);

    aba.getRange(i + 1, 7).setValue(hash);
    aba.getRange(i + 1, 8).setValue(salt);
    aba.getRange(i + 1, 4).clearContent();
  }
}

function carregarConfigObjeto() {
  const aba = obterPlanilha().getSheetByName("config");
  const valores = aba.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < valores.length; i++) {
    config[valores[i][0]] = valores[i][1];
  }

  return config;
}

function carregarConfig() {
  return resposta({
    erro: false,
    config: carregarConfigObjeto()
  });
}

function palpitesTravados() {
  const config = carregarConfigObjeto();

  if (!config.trava_palpites) {
    return false;
  }

  const trava = new Date(config.trava_palpites);

  if (Number.isNaN(trava.getTime())) {
    return false;
  }

  return new Date().getTime() >= trava.getTime();
}

function listarJogos() {
  const aba = obterPlanilha().getSheetByName("jogos");
  const valores = aba.getDataRange().getValues();
  const jogos = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    jogos.push({
      jogo_id: linha[0],
      data: linha[1],
      hora: linha[2],
      fase: linha[3],
      grupo: linha[4],
      time_a: linha[5],
      time_b: linha[6],
      gol_a: linha[7],
      gol_b: linha[8],
      encerrado: linha[9],
      proximo_jogo: linha[10],
      lado: linha[11],
      penalti_a: linha[12],
      penalti_b: linha[13]
    });
  }

  return resposta({
    erro: false,
    jogos
  });
}

function validarPalpiteObjeto(p) {
  const comecou =
    valorPreenchido(p.palpite_a) ||
    valorPreenchido(p.palpite_b) ||
    Boolean(p.classificado);

  if (!comecou) {
    return "";
  }

  if (!valorPreenchido(p.palpite_a) || !valorPreenchido(p.palpite_b)) {
    return "Jogo " + p.jogo_id + ": se preencher um lado do placar, preencha o outro também";
  }

  if (placarInvalido(p.palpite_a) || placarInvalido(p.palpite_b)) {
    return "Jogo " + p.jogo_id + ": placar inválido";
  }

  if (
    Number(p.palpite_a) === Number(p.palpite_b) &&
    p.fase !== "grupos" &&
    !p.classificado
  ) {
    return "Jogo " + p.jogo_id + ": empate no mata-mata precisa ter classificado";
  }

  return "";
}

function salvarPalpite(e) {
  if (palpitesTravados()) {
    return resposta({
      erro: true,
      mensagem: "Os palpites estão travados"
    });
  }

  const palpite = {
    usuario_id: e.parameter.usuario_id,
    jogo_id: e.parameter.jogo_id,
    palpite_a: e.parameter.palpite_a,
    palpite_b: e.parameter.palpite_b,
    fase: e.parameter.fase || "",
    classificado: e.parameter.classificado || ""
  };

  const erroValidacao = validarPalpiteObjeto(palpite);

  if (erroValidacao) {
    return resposta({
      erro: true,
      mensagem: erroValidacao
    });
  }

  const aba = obterPlanilha().getSheetByName("palpites");
  const valores = aba.getDataRange().getValues();
  const colunas = Math.max(8, valores[0].length);
  const mapaJogos =
    obterMapaJogosParaPontuacao();
  const pontos =
    calcularPontosPalpiteSalvo(
      mapaJogos[palpite.jogo_id],
      palpite.palpite_a,
      palpite.palpite_b,
      palpite.classificado
    );

  for (let i = 1; i < valores.length; i++) {
    if (
      valores[i][0] == palpite.usuario_id &&
      valores[i][1] == palpite.jogo_id
    ) {
      aba.getRange(i + 1, 3).setValue(palpite.palpite_a);
      aba.getRange(i + 1, 4).setValue(palpite.palpite_b);
      aba.getRange(i + 1, 5).setValue(pontos);
      aba.getRange(i + 1, 8).setValue(palpite.classificado);

      return resposta({
        erro: false,
        mensagem: "Palpite atualizado"
      });
    }
  }

  const novaLinha = new Array(colunas).fill("");
  novaLinha[0] = palpite.usuario_id;
  novaLinha[1] = palpite.jogo_id;
  novaLinha[2] = palpite.palpite_a;
  novaLinha[3] = palpite.palpite_b;
  novaLinha[4] = pontos;
  novaLinha[7] = palpite.classificado;

  aba.appendRow(novaLinha);

  return resposta({
    erro: false,
    mensagem: "Palpite salvo"
  });
}

function salvarPalpitesLote(e) {
  if (palpitesTravados()) {
    return resposta({
      erro: true,
      mensagem: "Os palpites estão travados"
    });
  }

  const usuario_id = e.parameter.usuario_id;
  const palpitesTexto = e.parameter.palpites;

  if (!usuario_id || !palpitesTexto) {
    return resposta({
      erro: true,
      mensagem: "Dados incompletos"
    });
  }

  const palpites = JSON.parse(palpitesTexto);

  for (let i = 0; i < palpites.length; i++) {
    const erroValidacao = validarPalpiteObjeto(palpites[i]);

    if (erroValidacao) {
      return resposta({
        erro: true,
        mensagem: erroValidacao
      });
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const aba = obterPlanilha().getSheetByName("palpites");
    const valores = aba.getDataRange().getValues();
    const colunas = Math.max(8, valores[0].length);
    const mapaJogos =
      obterMapaJogosParaPontuacao();
    const linhas = valores.map(linha => {
      while (linha.length < colunas) {
        linha.push("");
      }

      return linha;
    });
    const indice = {};

    for (let i = 1; i < linhas.length; i++) {
      indice[linhas[i][0] + "_" + linhas[i][1]] = i;
    }

    const novasLinhas = [];
    let totalSalvos = 0;

    palpites.forEach(p => {
      if (!p.jogo_id) {
        return;
      }

      const chave = usuario_id + "_" + p.jogo_id;
      const linhaIndex = indice[chave];

      if (linhaIndex) {
        const novoPalpiteA =
          valorPreenchido(p.palpite_a)
            ? p.palpite_a
            : linhas[linhaIndex][2];
        const novoPalpiteB =
          valorPreenchido(p.palpite_b)
            ? p.palpite_b
            : linhas[linhaIndex][3];
        const novoClassificado =
          p.classificado || linhas[linhaIndex][7] || "";

        linhas[linhaIndex][2] = novoPalpiteA;
        linhas[linhaIndex][3] = novoPalpiteB;
        linhas[linhaIndex][4] =
          calcularPontosPalpiteSalvo(
            mapaJogos[p.jogo_id],
            novoPalpiteA,
            novoPalpiteB,
            novoClassificado
          );
        linhas[linhaIndex][5] = p.time_a || "";
        linhas[linhaIndex][6] = p.time_b || "";
        linhas[linhaIndex][7] = novoClassificado;
      } else {
        const novaLinha = new Array(colunas).fill("");

        novaLinha[0] = usuario_id;
        novaLinha[1] = p.jogo_id;
        novaLinha[2] = p.palpite_a || "";
        novaLinha[3] = p.palpite_b || "";
        novaLinha[4] =
          calcularPontosPalpiteSalvo(
            mapaJogos[p.jogo_id],
            novaLinha[2],
            novaLinha[3],
            p.classificado || ""
          );
        novaLinha[5] = p.time_a || "";
        novaLinha[6] = p.time_b || "";
        novaLinha[7] = p.classificado || "";

        novasLinhas.push(novaLinha);
      }

      totalSalvos++;
    });

    if (linhas.length > 1) {
      aba
        .getRange(2, 1, linhas.length - 1, colunas)
        .setValues(linhas.slice(1));
    }

    if (novasLinhas.length > 0) {
      aba
        .getRange(aba.getLastRow() + 1, 1, novasLinhas.length, colunas)
        .setValues(novasLinhas);
    }

    return resposta({
      erro: false,
      mensagem: totalSalvos + " palpites salvos"
    });
  } finally {
    lock.releaseLock();
  }
}

function listarPalpites(e) {
  const usuario_id = String(e.parameter.usuario_id || "").trim();
  const aba = obterPlanilha().getSheetByName("palpites");
  const valores = aba.getDataRange().getValues();
  const palpitesPorJogo = {};

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (String(linha[0]).trim() == usuario_id) {
      const palpite = {
        jogo_id: String(linha[1]).trim(),
        palpite_a: linha[2],
        palpite_b: linha[3],
        pontos: linha[4],
        time_a: linha[5],
        time_b: linha[6],
        classificado: linha[7]
      };

      const atual =
        palpitesPorJogo[palpite.jogo_id];

      if (!atual || palpiteMaisCompleto(palpite, atual)) {
        palpitesPorJogo[palpite.jogo_id] = palpite;
      }
    }
  }

  return resposta({
    erro: false,
    palpites: Object.values(palpitesPorJogo)
  });
}

function palpiteMaisCompleto(novo, atual) {
  return pontuarPalpiteCompleto(novo) >= pontuarPalpiteCompleto(atual);
}

function pontuarPalpiteCompleto(palpite) {
  let pontos = 0;

  if (valorPreenchido(palpite.palpite_a)) {
    pontos++;
  }

  if (valorPreenchido(palpite.palpite_b)) {
    pontos++;
  }

  if (palpite.time_a) {
    pontos++;
  }

  if (palpite.time_b) {
    pontos++;
  }

  if (palpite.classificado) {
    pontos++;
  }

  return pontos;
}

function salvarResultado(e, sessao) {
  const jogo_id = e.parameter.jogo_id;
  const gol_a = e.parameter.gol_a;
  const gol_b = e.parameter.gol_b;
  let penalti_a = e.parameter.penalti_a || "";
  let penalti_b = e.parameter.penalti_b || "";

  if (placarInvalido(gol_a) || placarInvalido(gol_b)) {
    return resposta({
      erro: true,
      mensagem: "Placar inválido"
    });
  }

  const aba = obterPlanilha().getSheetByName("jogos");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (valores[i][0] == jogo_id) {
      const fase = valores[i][3];
      const ehMataMata = fase !== "grupos";
      const empate = Number(gol_a) === Number(gol_b);

      if (ehMataMata && empate) {
        if (placarInvalido(penalti_a) || placarInvalido(penalti_b)) {
          return resposta({
            erro: true,
            mensagem: "Empate no mata-mata precisa do placar dos pênaltis"
          });
        }

        if (Number(penalti_a) === Number(penalti_b)) {
          return resposta({
            erro: true,
            mensagem: "Pênaltis não podem terminar empatados"
          });
        }
      } else {
        penalti_a = "";
        penalti_b = "";
      }

      aba.getRange(i + 1, 8).setValue(gol_a);
      aba.getRange(i + 1, 9).setValue(gol_b);
      aba.getRange(i + 1, 10).setValue("SIM");
      aba.getRange(i + 1, 13).setValue(penalti_a);
      aba.getRange(i + 1, 14).setValue(penalti_b);

      calcularPontuacao(jogo_id, gol_a, gol_b, penalti_a, penalti_b);
      avancarVencedor(jogo_id, gol_a, gol_b, penalti_a, penalti_b);
      registrarLogResultado(sessao.usuario_id, valores[i], gol_a, gol_b, penalti_a, penalti_b);

      return resposta({
        erro: false,
        mensagem: "Resultado salvo"
      });
    }
  }

  return resposta({
    erro: true,
    mensagem: "Jogo não encontrado"
  });
}

function obterVencedorResultado(jogo, golA, golB, penaltiA, penaltiB) {
  if (Number(golA) > Number(golB)) {
    return jogo.time_a;
  }

  if (Number(golB) > Number(golA)) {
    return jogo.time_b;
  }

  if (jogo.fase !== "grupos") {
    if (Number(penaltiA) > Number(penaltiB)) {
      return jogo.time_a;
    }

    if (Number(penaltiB) > Number(penaltiA)) {
      return jogo.time_b;
    }
  }

  return "";
}

function obterMapaJogosParaPontuacao() {
  const abaJogos = obterPlanilha().getSheetByName("jogos");
  const jogos = abaJogos.getDataRange().getValues();
  const mapa = {};

  for (let i = 1; i < jogos.length; i++) {
    const linha = jogos[i];

    mapa[String(linha[0]).trim()] = {
      jogo_id: String(linha[0]).trim(),
      fase: linha[3],
      time_a: linha[5],
      time_b: linha[6],
      gol_a: linha[7],
      gol_b: linha[8],
      encerrado: linha[9],
      penalti_a: linha[12],
      penalti_b: linha[13]
    };
  }

  return mapa;
}

function calcularPontosPalpiteSalvo(jogo, palpiteA, palpiteB, classificado) {
  if (
    !jogo ||
    jogo.encerrado !== "SIM" ||
    !valorPreenchido(jogo.gol_a) ||
    !valorPreenchido(jogo.gol_b) ||
    !valorPreenchido(palpiteA) ||
    !valorPreenchido(palpiteB)
  ) {
    return 0;
  }

  const realA = Number(jogo.gol_a);
  const realB = Number(jogo.gol_b);
  const palpiteNumeroA = Number(palpiteA);
  const palpiteNumeroB = Number(palpiteB);

  if (Number.isNaN(palpiteNumeroA) || Number.isNaN(palpiteNumeroB)) {
    return 0;
  }

  if (jogo.fase !== "grupos" && realA === realB) {
    const vencedorReal =
      obterVencedorResultado(
        jogo,
        jogo.gol_a,
        jogo.gol_b,
        jogo.penalti_a,
        jogo.penalti_b
      );

    if (
      palpiteNumeroA === realA &&
      palpiteNumeroB === realB &&
      classificado === vencedorReal
    ) {
      return 3;
    }

    if (
      palpiteNumeroA === palpiteNumeroB &&
      classificado === vencedorReal
    ) {
      return 1;
    }

    return 0;
  }

  if (palpiteNumeroA === realA && palpiteNumeroB === realB) {
    return 3;
  }

  if (realA > realB && palpiteNumeroA > palpiteNumeroB) {
    return 1;
  }

  if (realA < realB && palpiteNumeroA < palpiteNumeroB) {
    return 1;
  }

  if (realA === realB && palpiteNumeroA === palpiteNumeroB) {
    return 1;
  }

  return 0;
}

function calcularPontuacao(jogo_id, gol_a, gol_b, penalti_a, penalti_b) {
  const planilha = obterPlanilha();
  const abaJogos = planilha.getSheetByName("jogos");
  const jogos = abaJogos.getDataRange().getValues();
  let jogo = null;

  for (let i = 1; i < jogos.length; i++) {
    if (jogos[i][0] == jogo_id) {
      jogo = {
        fase: jogos[i][3],
        time_a: jogos[i][5],
        time_b: jogos[i][6]
      };
      break;
    }
  }

  if (!jogo) {
    return;
  }

  const aba = planilha.getSheetByName("palpites");
  const valores = aba.getDataRange().getValues();
  const realA = Number(gol_a);
  const realB = Number(gol_b);
  const vencedorReal = obterVencedorResultado(
    jogo,
    gol_a,
    gol_b,
    penalti_a,
    penalti_b
  );

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (linha[1] != jogo_id) {
      continue;
    }

    if (!valorPreenchido(linha[2]) || !valorPreenchido(linha[3])) {
      aba.getRange(i + 1, 5).setValue(0);
      continue;
    }

    const palpiteA = Number(linha[2]);
    const palpiteB = Number(linha[3]);
    const classificado = linha[7];
    let pontos = 0;

    if (jogo.fase !== "grupos" && realA === realB) {
      if (palpiteA === realA && palpiteB === realB && classificado === vencedorReal) {
        pontos = 3;
      } else if (palpiteA === palpiteB && classificado === vencedorReal) {
        pontos = 1;
      }
    } else if (palpiteA === realA && palpiteB === realB) {
      pontos = 3;
    } else if (realA > realB && palpiteA > palpiteB) {
      pontos = 1;
    } else if (realA < realB && palpiteA < palpiteB) {
      pontos = 1;
    } else if (realA === realB && palpiteA === palpiteB) {
      pontos = 1;
    }

    aba.getRange(i + 1, 5).setValue(pontos);
  }
}

function recalcularPontuacaoGeral() {
  const abaJogos = obterPlanilha().getSheetByName("jogos");
  const jogos = abaJogos.getDataRange().getValues();
  let total = 0;

  for (let i = 1; i < jogos.length; i++) {
    const linha = jogos[i];

    if (
      linha[9] !== "SIM" ||
      !valorPreenchido(linha[7]) ||
      !valorPreenchido(linha[8])
    ) {
      continue;
    }

    calcularPontuacao(
      linha[0],
      linha[7],
      linha[8],
      linha[12],
      linha[13]
    );

    total++;
  }

  return resposta({
    erro: false,
    mensagem: total + " jogos recalculados"
  });
}

function avancarVencedor(jogo_id, gol_a, gol_b, penalti_a, penalti_b) {
  const aba = obterPlanilha().getSheetByName("jogos");
  const valores = aba.getDataRange().getValues();
  let vencedor = "";
  let proximoJogo = "";
  let lado = "";

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (linha[0] == jogo_id) {
      const jogo = {
        fase: linha[3],
        time_a: linha[5],
        time_b: linha[6]
      };

      vencedor = obterVencedorResultado(
        jogo,
        gol_a,
        gol_b,
        penalti_a,
        penalti_b
      );
      proximoJogo = linha[10];
      lado = linha[11];

      if (!proximoJogo || !lado || !vencedor) {
        return;
      }
    }
  }

  for (let i = 1; i < valores.length; i++) {
    if (valores[i][0] == proximoJogo) {
      if (lado == "A") {
        aba.getRange(i + 1, 6).setValue(vencedor);
      }

      if (lado == "B") {
        aba.getRange(i + 1, 7).setValue(vencedor);
      }
    }
  }
}

function ranking() {
  const planilha = obterPlanilha();
  const abaUsuarios = planilha.getSheetByName("usuarios");
  const abaPalpites = planilha.getSheetByName("palpites");
  const usuarios = abaUsuarios.getDataRange().getValues();
  const palpites = abaPalpites.getDataRange().getValues();
  const ranking = [];

  for (let i = 1; i < usuarios.length; i++) {
    const usuario = usuarios[i];
    const usuario_id = usuario[0];
    const nome = usuario[1];
    const admin = usuario[4];
    const ativo = usuario[5];

    if (admin === "SIM" || ativo !== "SIM") {
      continue;
    }

    let pontos = 0;

    for (let j = 1; j < palpites.length; j++) {
      const palpite = palpites[j];

      if (palpite[0] == usuario_id) {
        pontos += Number(palpite[4] || 0);
      }
    }

    ranking.push({
      usuario_id,
      nome,
      pontos
    });
  }

  ranking.sort((a, b) => b.pontos - a.pontos);

  return resposta({
    erro: false,
    ranking
  });
}

function premiacao() {
  const planilha = obterPlanilha();
  const usuarios = planilha.getSheetByName("usuarios").getDataRange().getValues();
  const configs = planilha.getSheetByName("config").getDataRange().getValues();
  const config = {};

  for (let i = 1; i < configs.length; i++) {
    config[configs[i][0]] = Number(configs[i][1]);
  }

  let totalParticipantes = 0;

  for (let i = 1; i < usuarios.length; i++) {
    if (usuarios[i][5] === "SIM" && usuarios[i][4] !== "SIM") {
      totalParticipantes++;
    }
  }

  const totalArrecadado = totalParticipantes * config.valor_inscricao;
  const valorCasa = totalArrecadado * (config.taxa_casa / 100);
  const premioTotal = totalArrecadado - valorCasa;

  return resposta({
    erro: false,
    totalParticipantes,
    totalArrecadado,
    valorCasa,
    premioTotal,
    premio1: premioTotal * (config.premio_1 / 100),
    premio2: premioTotal * (config.premio_2 / 100),
    premio3: premioTotal * (config.premio_3 / 100)
  });
}

function gerarFase32() {
  const abaJogos = obterPlanilha().getSheetByName("jogos");
  const valores = abaJogos.getDataRange().getValues();
  const grupos = {};

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (linha[3] !== "grupos") {
      continue;
    }

    const grupo = linha[4];
    const timeA = linha[5];
    const timeB = linha[6];

    if (!grupos[grupo]) {
      grupos[grupo] = {};
    }

    iniciarTime(grupos[grupo], timeA);
    iniciarTime(grupos[grupo], timeB);

    if (linha[9] !== "SIM") {
      continue;
    }

    aplicarResultado(
      grupos[grupo],
      timeA,
      timeB,
      Number(linha[7]),
      Number(linha[8])
    );
  }

  const classificados = {};
  const terceiros = [];

  for (let grupo in grupos) {
    const ordenado = Object.values(grupos[grupo]).sort(ordenarClassificacao);
    const jogosDoGrupo = valores.filter(linha =>
      linha[3] === "grupos" &&
      linha[4] === grupo
    );
    const jogosEncerrados = jogosDoGrupo.filter(linha =>
      linha[9] === "SIM"
    );

    if (ordenado.length < 4 || jogosEncerrados.length < 6) {
      return resposta({
        erro: true,
        mensagem: "Grupo " + grupo + " ainda não tem todos os jogos encerrados"
      });
    }

    classificados["1" + grupo] = ordenado[0].time;
    classificados["2" + grupo] = ordenado[1].time;
    terceiros.push({
      grupo,
      time: ordenado[2].time,
      pontos: ordenado[2].pontos,
      vitorias: ordenado[2].vitorias,
      saldo: ordenado[2].saldo,
      golsPro: ordenado[2].golsPro
    });
  }

  terceiros.sort(ordenarClassificacao);
  terceiros.slice(0, 8).forEach(terceiro => {
    classificados["3" + terceiro.grupo] = terceiro.time;
  });

  const mapaJogos = {
    73: ["2A", "2B"],
    74: ["1E", "3ABCDF"],
    75: ["1F", "2C"],
    76: ["1C", "2F"],
    77: ["1I", "3CDFGH"],
    78: ["2E", "2I"],
    79: ["1A", "3CEFHI"],
    80: ["1L", "3EHIJK"],
    81: ["1D", "3BEFIJ"],
    82: ["1G", "3AEHIJ"],
    83: ["2K", "2L"],
    84: ["1H", "2J"],
    85: ["1B", "3EFGIJ"],
    86: ["1J", "2H"],
    87: ["1K", "3DEIJL"],
    88: ["2D", "2G"]
  };

  for (let i = 1; i < valores.length; i++) {
    const confronto = mapaJogos[valores[i][0]];

    if (!confronto) {
      continue;
    }

    abaJogos.getRange(i + 1, 6).setValue(
      resolverClassificado(confronto[0], classificados)
    );
    abaJogos.getRange(i + 1, 7).setValue(
      resolverClassificado(confronto[1], classificados)
    );
  }

  return resposta({
    erro: false,
    mensagem: "Fase de 32 gerada"
  });
}

function iniciarTime(grupo, time) {
  if (!grupo[time]) {
    grupo[time] = {
      grupo: "",
      time,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0
    };
  }
}

function aplicarResultado(grupo, timeA, timeB, golA, golB) {
  grupo[timeA].grupo = grupo[timeA].grupo || "";
  grupo[timeB].grupo = grupo[timeB].grupo || "";
  grupo[timeA].jogos++;
  grupo[timeB].jogos++;
  grupo[timeA].golsPro += golA;
  grupo[timeA].golsContra += golB;
  grupo[timeB].golsPro += golB;
  grupo[timeB].golsContra += golA;
  grupo[timeA].saldo = grupo[timeA].golsPro - grupo[timeA].golsContra;
  grupo[timeB].saldo = grupo[timeB].golsPro - grupo[timeB].golsContra;

  if (golA > golB) {
    grupo[timeA].pontos += 3;
    grupo[timeA].vitorias++;
    grupo[timeB].derrotas++;
  } else if (golB > golA) {
    grupo[timeB].pontos += 3;
    grupo[timeB].vitorias++;
    grupo[timeA].derrotas++;
  } else {
    grupo[timeA].pontos++;
    grupo[timeB].pontos++;
    grupo[timeA].empates++;
    grupo[timeB].empates++;
  }
}

function ordenarClassificacao(a, b) {
  return b.pontos - a.pontos ||
    b.vitorias - a.vitorias ||
    b.saldo - a.saldo ||
    b.golsPro - a.golsPro ||
    a.time.localeCompare(b.time);
}

function resolverClassificado(codigo, classificados) {
  if (!codigo.startsWith("3")) {
    return classificados[codigo] || codigo;
  }

  const gruposPossiveis = codigo.slice(1).split("");

  for (let i = 0; i < gruposPossiveis.length; i++) {
    const chave = "3" + gruposPossiveis[i];

    if (classificados[chave]) {
      const time = classificados[chave];
      delete classificados[chave];
      return time;
    }
  }

  return codigo;
}

function criarUsuario(e, sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const nome = String(e.parameter.nome || "").trim();
  const senha = String(e.parameter.senha || "");

  if (!nome || !senha) {
    return resposta({ erro: true, mensagem: "Dados incompletos" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();
  const nomeExiste = valores.slice(1).some(linha =>
    String(linha[1] || "").trim().toLowerCase() === nome.toLowerCase()
  );

  if (nomeExiste) {
    return resposta({ erro: true, mensagem: "Este nome já existe" });
  }

  const maiorId = valores.slice(1).reduce((maior, linha) => {
    const id = Number(linha[0] || 0);
    return id > maior ? id : maior;
  }, 0);
  const baseLogin = nome.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "")
    .slice(0, 18);
  const loginProvisorio =
    baseLogin + "." + Math.floor(1000 + Math.random() * 9000);
  const salt = gerarSalt();
  const hash = gerarHashSenha(senha, salt);

  aba.appendRow([
    maiorId + 1,
    nome,
    loginProvisorio,
    "",
    "NAO",
    "SIM",
    hash,
    salt,
    "SIM",
    "NAO",
    "NAO"
  ]);

  return resposta({
    erro: false,
    mensagem: "Usuário criado. Login provisório: " + loginProvisorio
  });
}

function listarUsuariosAdmin(sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();
  const usuarios = valores.slice(1).map(linha => ({
    id: linha[0],
    nome: linha[1],
    login: linha[2],
    admin: linha[4],
    ativo: linha[5],
    trocaObrigatoria: linha[8],
    loginAlterado: linha[9],
    pago: linha[10],
    pagamento: linha[10]
  }));

  return resposta({
    erro: false,
    usuarios
  });
}

function alterarStatusUsuario(e, sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const usuarioId = String(e.parameter.usuario_id || "");
  const ativo = e.parameter.ativo === "SIM" ? "SIM" : "NAO";

  if (String(sessao.usuario_id) === usuarioId && ativo === "NAO") {
    return resposta({
      erro: true,
      mensagem: "Você não pode bloquear seu próprio acesso"
    });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === usuarioId) {
      aba.getRange(i + 1, 6).setValue(ativo);

      return resposta({
        erro: false,
        mensagem: ativo === "SIM" ? "Usuário desbloqueado" : "Usuário bloqueado"
      });
    }
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function excluirUsuario(e, sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const usuarioId = String(e.parameter.usuario_id || "");

  if (String(sessao.usuario_id) === usuarioId) {
    return resposta({
      erro: true,
      mensagem: "Você não pode excluir seu próprio usuário"
    });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === usuarioId) {
      aba.deleteRow(i + 1);
      return resposta({ erro: false, mensagem: "Usuário excluído" });
    }
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function resetarAcessoUsuario(e, sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const usuarioId = String(e.parameter.usuario_id || "");
  const senha = String(e.parameter.senha || e.parameter.senha_provisoria || "");

  if (!usuarioId || !senha) {
    return resposta({ erro: true, mensagem: "Dados incompletos" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === usuarioId) {
      const salt = gerarSalt();
      const hash = gerarHashSenha(senha, salt);

      aba.getRange(i + 1, 7).setValue(hash);
      aba.getRange(i + 1, 8).setValue(salt);
      aba.getRange(i + 1, 9).setValue("SIM");
      aba.getRange(i + 1, 10).setValue("NAO");

      return resposta({
        erro: false,
        mensagem: "Acesso resetado"
      });
    }
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function marcarPagamentoUsuario(e, sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const usuarioId = String(e.parameter.usuario_id || "");
  const pago = e.parameter.pago === "SIM" ? "SIM" : "NAO";

  if (!usuarioId) {
    return resposta({ erro: true, mensagem: "Usuário não informado" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();
  const cabecalho = criarMapaCabecalho(valores[0]);
  const colunaPago = garantirColuna(aba, cabecalho, "pago");

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === usuarioId) {
      aba.getRange(i + 1, colunaPago + 1).setValue(pago);

      return resposta({
        erro: false,
        mensagem: pago === "SIM" ? "Pagamento marcado" : "Pagamento desmarcado"
      });
    }
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function atualizarConfig(e, sessao) {
  if (!usuarioEhAdmin(sessao.usuario_id)) {
    return resposta({ erro: true, mensagem: "Apenas administrador" });
  }

  const chave = String(e.parameter.chave || "").trim();
  const valor = String(e.parameter.valor || "").trim();

  if (!chave) {
    return resposta({ erro: true, mensagem: "Config não informada" });
  }

  const aba = obterPlanilha().getSheetByName("config");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === chave) {
      aba.getRange(i + 1, 2).setValue(valor);
      return resposta({ erro: false, mensagem: "Config atualizada" });
    }
  }

  aba.appendRow([chave, valor]);

  return resposta({ erro: false, mensagem: "Config criada" });
}

function listarParticipantesStatus(e, sessao) {
  const planilha = obterPlanilha();
  const config = carregarConfigObjeto();

  if (
    !usuarioEhAdmin(sessao.usuario_id) &&
    config.participantes_liberado !== "SIM"
  ) {
    return resposta({
      erro: true,
      mensagem: "A tela de participantes está travada pelo administrador"
    });
  }

  const usuariosValores = planilha
    .getSheetByName("usuarios")
    .getDataRange()
    .getValues();
  const usuarios = usuariosValores.slice(1).map(linha => ({
    id: linha[0],
    nome: linha[1],
    login: linha[2],
    admin: linha[4],
    ativo: linha[5],
    trocaObrigatoria: linha[8]
  }));
  const palpitesValores = planilha
    .getSheetByName("palpites")
    .getDataRange()
    .getValues();
  const palpites = palpitesValores.slice(1).map(linha => ({
    usuario_id: linha[0],
    jogo_id: linha[1],
    palpite_a: linha[2],
    palpite_b: linha[3],
    pontos: linha[4],
    time_a: linha[5],
    time_b: linha[6],
    classificado: linha[7]
  }));

  return resposta({
    erro: false,
    usuarios,
    palpites
  });
}

function definirCredenciaisPermanentes(e, sessao) {
  const login = String(e.parameter.login || "").trim().toLowerCase();
  const senhaAtual = String(e.parameter.senha_atual || "");
  const novaSenha = String(e.parameter.nova_senha || "");

  if (!login || !senhaAtual || !novaSenha) {
    return resposta({ erro: true, mensagem: "Dados incompletos" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();
  const loginExiste = valores.slice(1).some(linha =>
    String(linha[0]) !== String(sessao.usuario_id) &&
    (
      String(linha[2] || "").trim().toLowerCase() === login ||
      String(linha[1] || "").trim().toLowerCase() === login
    )
  );

  if (loginExiste) {
    return resposta({ erro: true, mensagem: "Este login ou nome já existe" });
  }

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (String(linha[0]) !== String(sessao.usuario_id)) {
      continue;
    }

    if (gerarHashSenha(senhaAtual, linha[7]) !== linha[6]) {
      return resposta({ erro: true, mensagem: "Senha provisória inválida" });
    }

    const novoSalt = gerarSalt();
    const novoHash = gerarHashSenha(novaSenha, novoSalt);

    aba.getRange(i + 1, 3).setValue(login);
    aba.getRange(i + 1, 7).setValue(novoHash);
    aba.getRange(i + 1, 8).setValue(novoSalt);
    aba.getRange(i + 1, 9).setValue("NAO");

    return resposta({
      erro: false,
      mensagem: "Acesso permanente criado com sucesso"
    });
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function alterarLogin(e, sessao) {
  const login = String(e.parameter.login || "").trim().toLowerCase();
  const senhaAtual = String(e.parameter.senha_atual || "");

  if (!login || !senhaAtual) {
    return resposta({ erro: true, mensagem: "Dados incompletos" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();
  const loginExiste = valores.slice(1).some(linha =>
    String(linha[0]) !== String(sessao.usuario_id) &&
    (
      String(linha[2] || "").trim().toLowerCase() === login ||
      String(linha[1] || "").trim().toLowerCase() === login
    )
  );

  if (loginExiste) {
    return resposta({ erro: true, mensagem: "Este login ou nome já existe" });
  }

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];

    if (String(linha[0]) !== String(sessao.usuario_id)) {
      continue;
    }

    if (linha[9] === "SIM") {
      return resposta({
        erro: true,
        mensagem: "O login já foi alterado uma vez"
      });
    }

    if (gerarHashSenha(senhaAtual, linha[7]) !== linha[6]) {
      return resposta({ erro: true, mensagem: "Senha atual inválida" });
    }

    aba.getRange(i + 1, 3).setValue(login);
    aba.getRange(i + 1, 10).setValue("SIM");

    return resposta({
      erro: false,
      mensagem: "Login alterado com sucesso"
    });
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function alterarSenha(e, sessao) {
  const senhaAtual = String(e.parameter.senha_atual || "");
  const novaSenha = String(e.parameter.nova_senha || "");

  if (!senhaAtual || !novaSenha) {
    return resposta({ erro: true, mensagem: "Dados incompletos" });
  }

  const aba = obterPlanilha().getSheetByName("usuarios");
  const valores = aba.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) !== String(sessao.usuario_id)) {
      continue;
    }

    if (gerarHashSenha(senhaAtual, valores[i][7]) !== valores[i][6]) {
      return resposta({ erro: true, mensagem: "Senha atual inválida" });
    }

    const novoSalt = gerarSalt();
    const novoHash = gerarHashSenha(novaSenha, novoSalt);

    aba.getRange(i + 1, 7).setValue(novoHash);
    aba.getRange(i + 1, 8).setValue(novoSalt);

    return resposta({
      erro: false,
      mensagem: "Senha alterada com sucesso"
    });
  }

  return resposta({ erro: true, mensagem: "Usuário não encontrado" });
}

function registrarLogResultado(usuarioId, linhaAnterior, golA, golB, penaltiA, penaltiB) {
  const planilha = obterPlanilha();
  let aba = planilha.getSheetByName("logs_resultados");

  if (!aba) {
    aba = planilha.insertSheet("logs_resultados");
    aba.appendRow([
      "quando",
      "usuario_id",
      "jogo_id",
      "resultado_anterior",
      "resultado_novo"
    ]);
  }

  const anterior =
    valorPreenchido(linhaAnterior[7]) && valorPreenchido(linhaAnterior[8])
      ? linhaAnterior[7] + " x " + linhaAnterior[8] +
        (
          valorPreenchido(linhaAnterior[12]) && valorPreenchido(linhaAnterior[13])
            ? " (pênaltis " + linhaAnterior[12] + " x " + linhaAnterior[13] + ")"
            : ""
        )
      : "sem resultado";
  const novo =
    golA + " x " + golB +
    (
      valorPreenchido(penaltiA) && valorPreenchido(penaltiB)
        ? " (pênaltis " + penaltiA + " x " + penaltiB + ")"
        : ""
    );

  if (anterior === novo) {
    return;
  }

  aba.appendRow([
    new Date(),
    usuarioId,
    linhaAnterior[0],
    anterior,
    novo
  ]);
}
