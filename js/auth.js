function limparSessao() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("sessaoToken");
}

function logout() {
  limparSessao();
  window.location.href = "index.html";
}

function redirecionarSessaoExpirada() {
  limparSessao();
  window.location.href = "index.html";
}
