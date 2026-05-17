function resolverClassificado(codigo, classificados) {
  if (!codigo.startsWith("3")) {
    return classificados[codigo] || codigo;
  }

  const gruposPossiveis =
  codigo.slice(1).split("");

  for (let i = 0; i < gruposPossiveis.length; i++) {
    const chave =
    "3" + gruposPossiveis[i];

    if (classificados[chave]) {
      const time =
      classificados[chave];

      delete classificados[chave];

      return time;
    }
  }

  return codigo;
}

function obterTerceirosFifa(terceirosClassificados) {
  const chave =
  terceirosClassificados
    .map(terceiro => terceiro.grupo)
    .sort()
    .join("");

  const linhaFifa =
  typeof tabelaFifaTerceiros !== "undefined"
  ? tabelaFifaTerceiros[chave]
  : null;

  if (!linhaFifa) {
    return null;
  }

  const mapa = {};

  ordemColunasFifaTerceiros.forEach((coluna, index) => {
    mapa[coluna] = linhaFifa[index];
  });

  return mapa;
}

const resolverClassificadoPalpite = resolverClassificado;
const obterTerceirosFifaPalpite = obterTerceirosFifa;
