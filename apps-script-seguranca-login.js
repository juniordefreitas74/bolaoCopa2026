/*
  Modelo para colar no Google Apps Script.

  Estrutura sugerida da aba usuarios:
  id | nome | login | senha_hash | senha_salt | admin

  Estrutura sugerida da aba sessoes:
  token | usuario_id | criado_em | expira_em | ativo
*/

const TEMPO_SESSAO_HORAS = 12;

function loginSeguro_(login, senha) {
  const usuariosSheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const usuarios =
    usuariosSheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(usuarios[0]);

  const loginNormalizado =
    String(login || "").trim().toLowerCase();

  const linhaUsuario =
    usuarios.slice(1).find(linha =>
      String(linha[cabecalho.login] || "").trim().toLowerCase() ===
      loginNormalizado
    );

  if (!linhaUsuario) {
    return {
      erro: true,
      mensagem: "Login ou senha invalidos"
    };
  }

  const salt =
    linhaUsuario[cabecalho.senha_salt];

  const hashSalvo =
    linhaUsuario[cabecalho.senha_hash];

  const hashInformado =
    gerarHashSenha_(senha, salt);

  if (hashInformado !== hashSalvo) {
    return {
      erro: true,
      mensagem: "Login ou senha invalidos"
    };
  }

  const token =
    criarTokenSessao_(linhaUsuario[cabecalho.id]);

  return {
    erro: false,
    token,
    usuario: {
      id: linhaUsuario[cabecalho.id],
      nome: linhaUsuario[cabecalho.nome],
      admin: linhaUsuario[cabecalho.admin]
    }
  };
}

function criarTokenSessao_(usuarioId) {
  const sessoesSheet =
    obterOuCriarAbaSessoes_();

  const agora =
    new Date();

  const expiraEm =
    new Date(
      agora.getTime() +
      TEMPO_SESSAO_HORAS * 60 * 60 * 1000
    );

  const token =
    Utilities.getUuid() + "-" + Utilities.getUuid();

  sessoesSheet.appendRow([
    token,
    usuarioId,
    agora,
    expiraEm,
    "SIM"
  ]);

  return token;
}

function validarSessao_(token) {
  if (!token) {
    return null;
  }

  const sessoesSheet =
    obterOuCriarAbaSessoes_();

  const sessoes =
    sessoesSheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(sessoes[0]);

  const agora =
    new Date();

  const sessao =
    sessoes.slice(1).find(linha =>
      linha[cabecalho.token] === token &&
      linha[cabecalho.ativo] === "SIM" &&
      new Date(linha[cabecalho.expira_em]).getTime() > agora.getTime()
    );

  if (!sessao) {
    return null;
  }

  return {
    usuario_id: sessao[cabecalho.usuario_id]
  };
}

function exigirSessao_(params) {
  const sessao =
    validarSessao_(params.token);

  if (!sessao) {
    throw new Error("SESSAO_INVALIDA");
  }

  return sessao;
}

function gerarSalt_() {
  return Utilities.getUuid();
}

function gerarHashSenha_(senha, salt) {
  const bytes =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(salt) + ":" + String(senha),
      Utilities.Charset.UTF_8
    );

  return bytes
    .map(byte => {
      const valor =
        byte < 0 ? byte + 256 : byte;

      return ("0" + valor.toString(16)).slice(-2);
    })
    .join("");
}

function migrarSenhaTextoParaHash() {
  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  valores.slice(1).forEach((linha, index) => {
    const senhaTexto =
      linha[cabecalho.senha];

    if (!senhaTexto) {
      return;
    }

    const salt =
      gerarSalt_();

    const hash =
      gerarHashSenha_(senhaTexto, salt);

    const numeroLinha =
      index + 2;

    sheet
      .getRange(numeroLinha, cabecalho.senha_hash + 1)
      .setValue(hash);

    sheet
      .getRange(numeroLinha, cabecalho.senha_salt + 1)
      .setValue(salt);

    sheet
      .getRange(numeroLinha, cabecalho.senha + 1)
      .clearContent();
  });
}

function criarUsuarioSeguro_(params, sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const nome =
    String(params.nome || "").trim();

  const login =
    gerarLoginProvisorio_(nome);

  const senha =
    String(params.senha || "");

  const admin =
    params.admin === "SIM" ? "SIM" : "NAO";

  if (!nome || !login || !senha) {
    return {
      erro: true,
      mensagem: "Dados incompletos"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  const nomeExiste =
    valores.slice(1).some(linha =>
      String(linha[cabecalho.nome] || "").trim().toLowerCase() ===
      nome.toLowerCase()
    );

  if (nomeExiste) {
    return {
      erro: true,
      mensagem: "Este nome ja existe"
    };
  }

  const loginExiste =
    valores.slice(1).some(linha =>
      String(linha[cabecalho.login] || "").trim().toLowerCase() === login
    );

  if (loginExiste) {
    return {
      erro: true,
      mensagem: "Este login ja existe"
    };
  }

  const salt =
    gerarSalt_();

  const hash =
    gerarHashSenha_(senha, salt);

  const novaLinha =
    new Array(valores[0].length).fill("");

  novaLinha[cabecalho.id] =
    obterProximoUsuarioId_(valores, cabecalho);

  novaLinha[cabecalho.nome] =
    nome;

  novaLinha[cabecalho.login] =
    login;

  novaLinha[cabecalho.admin] =
    admin;

  novaLinha[cabecalho.ativo] =
    "SIM";

  novaLinha[cabecalho.senha_hash] =
    hash;

  novaLinha[cabecalho.senha_salt] =
    salt;

  sheet.appendRow(novaLinha);

  return {
    erro: false,
    mensagem: "Usuario criado. Login provisorio: " + login,
    login_provisorio: login
  };
}

function resetarAcessoUsuarioSeguro_(params, sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const identificador =
    String(params.identificador || "").trim().toLowerCase();

  const senha =
    String(params.senha || "");

  if (!identificador || !senha) {
    return {
      erro: true,
      mensagem: "Dados incompletos"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  for (let i = 1; i < valores.length; i++) {
    const linha =
      valores[i];

    const encontrou =
      String(linha[cabecalho.id]) === identificador ||
      String(linha[cabecalho.login] || "").trim().toLowerCase() === identificador ||
      String(linha[cabecalho.nome] || "").trim().toLowerCase() === identificador;

    if (!encontrou) {
      continue;
    }

    const loginProvisorio =
      gerarLoginProvisorio_(linha[cabecalho.nome]);

    const salt =
      gerarSalt_();

    const hash =
      gerarHashSenha_(senha, salt);

    sheet
      .getRange(i + 1, cabecalho.login + 1)
      .setValue(loginProvisorio);

    sheet
      .getRange(i + 1, cabecalho.senha_hash + 1)
      .setValue(hash);

    sheet
      .getRange(i + 1, cabecalho.senha_salt + 1)
      .setValue(salt);

    sheet
      .getRange(i + 1, cabecalho.troca_obrigatoria + 1)
      .setValue("SIM");

    return {
      erro: false,
      mensagem: "Acesso resetado. Login provisorio: " + loginProvisorio,
      login_provisorio: loginProvisorio
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function listarUsuariosAdminSeguro_(sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  const usuarios =
    valores.slice(1).map(linha => ({
      id: linha[cabecalho.id],
      nome: linha[cabecalho.nome],
      login: linha[cabecalho.login],
      admin: linha[cabecalho.admin],
      ativo: linha[cabecalho.ativo],
      trocaObrigatoria: linha[cabecalho.troca_obrigatoria],
      loginAlterado: linha[cabecalho.login_alterado],
      pago: cabecalho.pago === undefined ? "" : linha[cabecalho.pago],
      pagamento: cabecalho.pago === undefined ? "" : linha[cabecalho.pago]
    }));

  return {
    erro: false,
    usuarios
  };
}

function marcarPagamentoUsuarioSeguro_(params, sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const usuarioId =
    String(params.usuario_id || "");

  const pago =
    params.pago === "SIM" ? "SIM" : "NAO";

  if (!usuarioId) {
    return {
      erro: true,
      mensagem: "Usuario nao informado"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  let colunaPago =
    cabecalho.pago;

  if (colunaPago === undefined) {
    colunaPago =
      valores[0].length;

    sheet
      .getRange(1, colunaPago + 1)
      .setValue("pago");
  }

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][cabecalho.id]) !== usuarioId) {
      continue;
    }

    sheet
      .getRange(i + 1, colunaPago + 1)
      .setValue(pago);

    return {
      erro: false,
      mensagem: pago === "SIM"
        ? "Pagamento marcado"
        : "Pagamento desmarcado"
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function alterarStatusUsuarioSeguro_(params, sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const usuarioId =
    String(params.usuario_id || "");

  const ativo =
    params.ativo === "SIM" ? "SIM" : "NAO";

  if (!usuarioId) {
    return {
      erro: true,
      mensagem: "Usuario nao informado"
    };
  }

  if (String(sessao.usuario_id) === usuarioId && ativo === "NAO") {
    return {
      erro: true,
      mensagem: "Voce nao pode bloquear seu proprio acesso"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][cabecalho.id]) !== usuarioId) {
      continue;
    }

    sheet
      .getRange(i + 1, cabecalho.ativo + 1)
      .setValue(ativo);

    return {
      erro: false,
      mensagem: ativo === "SIM"
        ? "Usuario desbloqueado"
        : "Usuario bloqueado"
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function excluirUsuarioSeguro_(params, sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const usuarioId =
    String(params.usuario_id || "");

  if (!usuarioId) {
    return {
      erro: true,
      mensagem: "Usuario nao informado"
    };
  }

  if (String(sessao.usuario_id) === usuarioId) {
    return {
      erro: true,
      mensagem: "Voce nao pode excluir seu proprio usuario"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][cabecalho.id]) !== usuarioId) {
      continue;
    }

    sheet.deleteRow(i + 1);

    return {
      erro: false,
      mensagem: "Usuario excluido"
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function atualizarConfigSeguro_(params, sessao) {
  if (!usuarioEhAdmin_(sessao.usuario_id)) {
    return {
      erro: true,
      mensagem: "Apenas administrador"
    };
  }

  const chave =
    String(params.chave || "").trim();

  const valor =
    String(params.valor || "").trim();

  if (!chave) {
    return {
      erro: true,
      mensagem: "Config nao informada"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("config");

  const valores =
    sheet.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === chave) {
      sheet
        .getRange(i + 1, 2)
        .setValue(valor);

      return {
        erro: false,
        mensagem: "Config atualizada"
      };
    }
  }

  sheet.appendRow([
    chave,
    valor
  ]);

  return {
    erro: false,
    mensagem: "Config criada"
  };
}

function definirCredenciaisPermanentesSeguro_(params, sessao) {
  const login =
    String(params.login || "").trim().toLowerCase();

  const senhaAtual =
    String(params.senha_atual || "");

  const novaSenha =
    String(params.nova_senha || "");

  if (!login || !senhaAtual || !novaSenha) {
    return {
      erro: true,
      mensagem: "Dados incompletos"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  const loginExiste =
    valores.slice(1).some(linha =>
      String(linha[cabecalho.id]) !== String(sessao.usuario_id) &&
      (
        String(linha[cabecalho.login] || "").trim().toLowerCase() === login ||
        String(linha[cabecalho.nome] || "").trim().toLowerCase() === login
      )
    );

  if (loginExiste) {
    return {
      erro: true,
      mensagem: "Este login ou nome ja existe"
    };
  }

  for (let i = 1; i < valores.length; i++) {
    const linha =
      valores[i];

    if (String(linha[cabecalho.id]) !== String(sessao.usuario_id)) {
      continue;
    }

    const hashAtual =
      gerarHashSenha_(senhaAtual, linha[cabecalho.senha_salt]);

    if (hashAtual !== linha[cabecalho.senha_hash]) {
      return {
        erro: true,
        mensagem: "Senha provisoria invalida"
      };
    }

    const novoSalt =
      gerarSalt_();

    const novoHash =
      gerarHashSenha_(novaSenha, novoSalt);

    sheet
      .getRange(i + 1, cabecalho.login + 1)
      .setValue(login);

    sheet
      .getRange(i + 1, cabecalho.senha_hash + 1)
      .setValue(novoHash);

    sheet
      .getRange(i + 1, cabecalho.senha_salt + 1)
      .setValue(novoSalt);

    sheet
      .getRange(i + 1, cabecalho.troca_obrigatoria + 1)
      .setValue("NAO");

    sheet
      .getRange(i + 1, cabecalho.login_alterado + 1)
      .setValue("SIM");

    return {
      erro: false,
      mensagem: "Acesso permanente criado com sucesso"
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function alterarLoginSeguro_(params, sessao) {
  const login =
    String(params.login || "").trim().toLowerCase();

  const senhaAtual =
    String(params.senha_atual || "");

  if (!login || !senhaAtual) {
    return {
      erro: true,
      mensagem: "Dados incompletos"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  const loginExiste =
    valores.slice(1).some(linha =>
      String(linha[cabecalho.id]) !== String(sessao.usuario_id) &&
      (
        String(linha[cabecalho.login] || "").trim().toLowerCase() === login ||
        String(linha[cabecalho.nome] || "").trim().toLowerCase() === login
      )
    );

  if (loginExiste) {
    return {
      erro: true,
      mensagem: "Este login ou nome ja existe"
    };
  }

  for (let i = 1; i < valores.length; i++) {
    const linha =
      valores[i];

    if (String(linha[cabecalho.id]) !== String(sessao.usuario_id)) {
      continue;
    }

    if (linha[cabecalho.login_alterado] === "SIM") {
      return {
        erro: true,
        mensagem: "O login ja foi alterado uma vez"
      };
    }

    const hashAtual =
      gerarHashSenha_(senhaAtual, linha[cabecalho.senha_salt]);

    if (hashAtual !== linha[cabecalho.senha_hash]) {
      return {
        erro: true,
        mensagem: "Senha atual invalida"
      };
    }

    sheet
      .getRange(i + 1, cabecalho.login + 1)
      .setValue(login);

    sheet
      .getRange(i + 1, cabecalho.login_alterado + 1)
      .setValue("SIM");

    return {
      erro: false,
      mensagem: "Login alterado com sucesso"
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function alterarSenhaSeguro_(params, sessao) {
  const senhaAtual =
    String(params.senha_atual || "");

  const novaSenha =
    String(params.nova_senha || "");

  if (!senhaAtual || !novaSenha) {
    return {
      erro: true,
      mensagem: "Dados incompletos"
    };
  }

  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  for (let i = 1; i < valores.length; i++) {
    const linha =
      valores[i];

    if (String(linha[cabecalho.id]) !== String(sessao.usuario_id)) {
      continue;
    }

    const hashAtual =
      gerarHashSenha_(
        senhaAtual,
        linha[cabecalho.senha_salt]
      );

    if (hashAtual !== linha[cabecalho.senha_hash]) {
      return {
        erro: true,
        mensagem: "Senha atual invalida"
      };
    }

    const novoSalt =
      gerarSalt_();

    const novoHash =
      gerarHashSenha_(
        novaSenha,
        novoSalt
      );

    sheet
      .getRange(i + 1, cabecalho.senha_hash + 1)
      .setValue(novoHash);

    sheet
      .getRange(i + 1, cabecalho.senha_salt + 1)
      .setValue(novoSalt);

    return {
      erro: false,
      mensagem: "Senha alterada com sucesso"
    };
  }

  return {
    erro: true,
    mensagem: "Usuario nao encontrado"
  };
}

function usuarioEhAdmin_(usuarioId) {
  const sheet =
    SpreadsheetApp.getActive().getSheetByName("usuarios");

  const valores =
    sheet.getDataRange().getValues();

  const cabecalho =
    criarMapaCabecalho_(valores[0]);

  return valores.slice(1).some(linha =>
    String(linha[cabecalho.id]) === String(usuarioId) &&
    linha[cabecalho.admin] === "SIM"
  );
}

function obterProximoUsuarioId_(valores, cabecalho) {
  const maiorId =
    valores.slice(1).reduce((maior, linha) => {
      const id =
        Number(linha[cabecalho.id] || 0);

      return id > maior ? id : maior;
    }, 0);

  return maiorId + 1;
}

function gerarLoginProvisorio_(nome) {
  const base =
    String(nome || "usuario")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/(^\.|\.$)/g, "")
      .slice(0, 18) || "usuario";

  const sufixo =
    Math.floor(1000 + Math.random() * 9000);

  return base + "." + sufixo;
}

function obterOuCriarAbaSessoes_() {
  const planilha =
    SpreadsheetApp.getActive();

  let sheet =
    planilha.getSheetByName("sessoes");

  if (!sheet) {
    sheet =
      planilha.insertSheet("sessoes");

    sheet.appendRow([
      "token",
      "usuario_id",
      "criado_em",
      "expira_em",
      "ativo"
    ]);
  }

  return sheet;
}

function criarMapaCabecalho_(cabecalho) {
  const mapa = {};

  cabecalho.forEach((coluna, index) => {
    mapa[String(coluna).trim()] = index;
  });

  return mapa;
}

/*
  Exemplo dentro do seu doPost(e):

  function doPost(e) {
    const params = e.parameter;

    try {
      if (params.acao === "login") {
        return json_(loginSeguro_(params.login, params.senha));
      }

      if (params.acao === "salvarResultado") {
        const sessao = exigirSessao_(params);
        // conferir se sessao.usuario_id pertence a admin antes de salvar
      }
    } catch (erro) {
      if (erro.message === "SESSAO_INVALIDA") {
        return json_({
          erro: true,
          sessaoInvalida: true,
          mensagem: "Sessao expirada. Entre novamente."
        });
      }

      return json_({
        erro: true,
        mensagem: "Erro interno"
      });
    }
  }
*/
