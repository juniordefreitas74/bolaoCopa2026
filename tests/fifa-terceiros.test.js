const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raizProjeto =
path.resolve(__dirname, "..");

function lerArquivo(caminho) {
  return fs.readFileSync(
    path.join(raizProjeto, caminho),
    "utf8"
  );
}

const codigo =
lerArquivo("js/core/mata-mata.js") +
"\n" +
lerArquivo("js/core/fifa-terceiros.js") +
"\n" +
lerArquivo("js/core/fase32.js") +
"\n" +
"({ tabelaFifaTerceiros, ordemColunasFifaTerceiros, obterTerceirosFifa });";

const {
  tabelaFifaTerceiros,
  ordemColunasFifaTerceiros,
  obterTerceirosFifa
} = vm.runInNewContext(codigo, {});

const grupos =
"ABCDEFGHIJKL".split("");

function combinar(lista, tamanho, inicio = 0, atual = [], saida = []) {
  if (atual.length === tamanho) {
    saida.push(atual.join(""));
    return saida;
  }

  for (let i = inicio; i < lista.length; i++) {
    combinar(
      lista,
      tamanho,
      i + 1,
      atual.concat(lista[i]),
      saida
    );
  }

  return saida;
}

function canonicalizarTabela(tabela) {
  return JSON.stringify(
    Object.keys(tabela)
      .sort()
      .reduce((acc, chave) => {
        acc[chave] = tabela[chave];
        return acc;
      }, {})
  );
}

const chaves =
Object.keys(tabelaFifaTerceiros).sort();

assert.strictEqual(
  chaves.length,
  495,
  "A tabela precisa ter C(12, 8) = 495 combinacoes."
);

assert.deepStrictEqual(
  chaves,
  combinar(grupos, 8),
  "A tabela precisa conter todas as combinacoes de 8 terceiros entre os grupos A-L."
);

assert.deepStrictEqual(
  Array.from(ordemColunasFifaTerceiros),
  ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"],
  "A ordem dos cruzamentos dos terceiros precisa permanecer estavel."
);

for (const chave of chaves) {
  const linha =
  tabelaFifaTerceiros[chave];

  assert.strictEqual(
    linha.length,
    8,
    "Cada combinacao precisa preencher os 8 cruzamentos: " + chave
  );

  assert.strictEqual(
    new Set(linha).size,
    8,
    "A mesma combinacao nao pode repetir terceiro colocado: " + chave
  );

  linha.forEach(codigoTerceiro => {
    assert.match(
      codigoTerceiro,
      /^3[A-L]$/,
      "Codigo de terceiro invalido em " + chave + ": " + codigoTerceiro
    );

    assert.ok(
      chave.includes(codigoTerceiro.slice(1)),
      "A combinacao " + chave + " usou grupo que nao classificou: " + codigoTerceiro
    );
  });
}

assert.deepStrictEqual(
  Array.from(tabelaFifaTerceiros.ABCDEFGH),
  ["3H", "3G", "3B", "3C", "3A", "3F", "3D", "3E"],
  "Referencia conhecida ABCDEFGH mudou."
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(obterTerceirosFifa([
    { grupo: "H" },
    { grupo: "G" },
    { grupo: "F" },
    { grupo: "E" },
    { grupo: "D" },
    { grupo: "C" },
    { grupo: "B" },
    { grupo: "A" }
  ]))),
  {
    "1A": "3H",
    "1B": "3G",
    "1D": "3B",
    "1E": "3C",
    "1G": "3A",
    "1I": "3F",
    "1K": "3D",
    "1L": "3E"
  },
  "obterTerceirosFifa precisa ordenar a chave antes de consultar a tabela."
);

assert.strictEqual(
  obterTerceirosFifa([{ grupo: "A" }]),
  null,
  "Combinacao incompleta nao pode gerar cruzamento."
);

assert.strictEqual(
  crypto
    .createHash("sha256")
    .update(canonicalizarTabela(tabelaFifaTerceiros))
    .digest("hex"),
  "2a9d4545dab48dcfbb2bbda33cff2f53f20db054ea2aebeb6090c9854c56f19e",
  "A tabela FIFA dos terceiros mudou. Confira se a alteracao foi intencional."
);

console.log("Tabela FIFA dos terceiros validada com sucesso.");
