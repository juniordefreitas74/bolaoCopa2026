(function () {
  const CHAVE_TEMA = "temaVisual";
  const TEMA_DIA = "dia";
  const TEMA_NOITE = "noite";

  function obterTemaSalvo() {
    return localStorage.getItem(CHAVE_TEMA) || TEMA_DIA;
  }

  function aplicarTema(tema) {
    const temaNormalizado =
    tema === TEMA_NOITE ? TEMA_NOITE : TEMA_DIA;

    document.documentElement.classList.toggle(
      "tema-noite",
      temaNormalizado === TEMA_NOITE
    );

    document.documentElement.classList.toggle(
      "tema-dia",
      temaNormalizado === TEMA_DIA
    );

    if (document.body) {
      document.body.classList.toggle(
        "tema-noite",
        temaNormalizado === TEMA_NOITE
      );

      document.body.classList.toggle(
        "tema-dia",
        temaNormalizado === TEMA_DIA
      );
    }

    localStorage.setItem(CHAVE_TEMA, temaNormalizado);
    atualizarBotaoTema(temaNormalizado);
  }

  function alternarTema() {
    const temaAtual =
    obterTemaSalvo();

    aplicarTema(
      temaAtual === TEMA_NOITE ? TEMA_DIA : TEMA_NOITE
    );
  }

  function atualizarBotaoTema(tema) {
    const botao =
    document.getElementById("botaoAlternarTema");

    if (!botao) {
      return;
    }

    const modoNoite =
    tema === TEMA_NOITE;

    botao.innerText =
    modoNoite ? "☀" : "☾";

    botao.title =
    modoNoite
    ? "Usar cores diurnas"
    : "Usar cores noturnas";

    botao.setAttribute(
      "aria-label",
      botao.title
    );
  }

  function criarBotaoTema() {
    if (document.getElementById("botaoAlternarTema")) {
      return;
    }

    const botao =
    document.createElement("button");

    botao.type = "button";
    botao.id = "botaoAlternarTema";
    botao.className = "botao-tema";
    botao.onclick = alternarTema;

    document.body.appendChild(botao);
    aplicarTema(obterTemaSalvo());
  }

  aplicarTema(obterTemaSalvo());

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      criarBotaoTema
    );
  } else {
    criarBotaoTema();
  }
})();
