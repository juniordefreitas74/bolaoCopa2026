function criarCorpoApi(acao) {
  const corpo =
  new URLSearchParams();

  corpo.append("acao", acao);
  corpo.append(
    "token",
    localStorage.getItem("sessaoToken") || ""
  );

  return corpo;
}

async function chamarApiProtegida(acao, parametros) {
  const corpo =
  criarCorpoApi(acao);

  Object.entries(parametros || {})
  .forEach(([chave, valor]) => {
    corpo.append(chave, valor);
  });

  let dados;

  try {
    const resposta =
    await fetch(
      API,
      {
        method: "POST",
        body: corpo
      }
    );

    if (!resposta.ok) {
      throw new Error("HTTP " + resposta.status);
    }

    dados =
    await resposta.json();
  } catch (erro) {
    throw new Error(
      "N\u00e3o foi poss\u00edvel conectar ao servidor. Tente novamente em instantes."
    );
  }

  if (dados.erro && dados.sessaoInvalida) {
    if (typeof redirecionarSessaoExpirada === "function") {
      redirecionarSessaoExpirada();
    }

    throw new Error("Sess\u00e3o inv\u00e1lida");
  }

  return dados;
}

async function chamarApiPublica(url) {
  try {
    const resposta =
    await fetch(url);

    if (!resposta.ok) {
      throw new Error("HTTP " + resposta.status);
    }

    return await resposta.json();
  } catch (erro) {
    throw new Error(
      "N\u00e3o foi poss\u00edvel carregar os dados agora. Tente novamente em instantes."
    );
  }
}
