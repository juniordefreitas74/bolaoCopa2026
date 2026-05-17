const usuarioLogado =
localStorage.getItem("usuario");

const tokenSessao =
localStorage.getItem("sessaoToken");

if(usuarioLogado && tokenSessao){

  window.location.href =
  "dashboard.html";

}


async function fazerLogin() {
  const mensagem =
  document.getElementById("msg");

  const botao =
  document.querySelector(".login-box button");

  const login =
  document.getElementById("login").value.trim();

  const senha =
  document.getElementById("senha").value;

  if (!login || !senha) {
    mensagem.innerText =
    "Informe login e senha.";

    return;
  }

  const corpo =
  new URLSearchParams();

  corpo.append("acao", "login");
  corpo.append("login", login);
  corpo.append("senha", senha);

  try {
    mensagem.innerText = "";
    botao.disabled = true;
    botao.innerText = "Entrando...";

    const resposta =
    await fetch(
      API,
      {
        method: "POST",
        body: corpo
      }
    );

    const dados =
    await resposta.json();

    if (dados.erro) {

      mensagem.innerText = dados.mensagem;

      return;

    }

    if (!dados.token) {

      mensagem.innerText =
      "Login sem token de sess\u00e3o. Atualize o Apps Script antes de entrar.";

      return;

    }

    localStorage.setItem(
      "usuario",
      JSON.stringify(dados.usuario)
    );

    localStorage.setItem(
      "sessaoToken",
      dados.token
    );

    window.location.href =
    "dashboard.html";
  } catch (erro) {
    mensagem.innerText =
    "N\u00e3o foi poss\u00edvel conectar ao servidor agora. Tente novamente em instantes.";
  } finally {
    botao.disabled = false;
    botao.innerText = "Entrar";
  }

}
