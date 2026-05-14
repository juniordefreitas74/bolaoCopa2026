const usuarioLogado =
localStorage.getItem("usuario");

if(usuarioLogado){

  window.location.href =
  "dashboard.html";

}

const API =
"https://script.google.com/macros/s/AKfycby24_HOph3BjgLOtj1S1Wof0geLsE0uglpYIBgJTkMLogSei6hK0O5WhHyMep8-odn4/exec";

async function fazerLogin() {

  const login =
  document.getElementById("login").value;

  const senha =
  document.getElementById("senha").value;

  const url =

    API +

    "?acao=login" +

    "&login=" + encodeURIComponent(login) +

    "&senha=" + encodeURIComponent(senha);

  const resposta =
  await fetch(url);

  const dados =
  await resposta.json();

  if (dados.erro) {

    document.getElementById("msg")
    .innerText = dados.mensagem;

    return;

  }

  localStorage.setItem(
    "usuario",
    JSON.stringify(dados.usuario)
  );

  window.location.href =
  "dashboard.html";

  console.log(dados.usuario);

}