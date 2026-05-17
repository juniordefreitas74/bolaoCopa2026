const titulosFase = {
  grupos: "Fase de Grupos",
  fase_32: "Fase de 32",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semi: "Semifinal",
  terceiro_lugar: "Disputa de 3&ordm; Lugar",
  final: "Final"
};

const ordemFases = [
  "grupos",
  "fase_32",
  "oitavas",
  "quartas",
  "semi",
  "terceiro_lugar",
  "final"
];

const mapaFase32 = {
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

const mapaFase32Palpite = mapaFase32;

const mapaColunasFifaTerceiros = {
  79: "1A",
  85: "1B",
  81: "1D",
  74: "1E",
  82: "1G",
  77: "1I",
  87: "1K",
  80: "1L"
};

const ordemColunasFifaTerceiros = [
  "1A",
  "1B",
  "1D",
  "1E",
  "1G",
  "1I",
  "1K",
  "1L"
];

const avancosMataMata = {
  73: { vencedor: [90, "A"] },
  74: { vencedor: [89, "A"] },
  75: { vencedor: [90, "B"] },
  76: { vencedor: [91, "A"] },
  77: { vencedor: [89, "B"] },
  78: { vencedor: [91, "B"] },
  79: { vencedor: [92, "A"] },
  80: { vencedor: [92, "B"] },
  81: { vencedor: [94, "A"] },
  82: { vencedor: [94, "B"] },
  83: { vencedor: [93, "A"] },
  84: { vencedor: [93, "B"] },
  85: { vencedor: [96, "A"] },
  86: { vencedor: [95, "A"] },
  87: { vencedor: [96, "B"] },
  88: { vencedor: [95, "B"] },
  89: { vencedor: [97, "A"] },
  90: { vencedor: [97, "B"] },
  91: { vencedor: [99, "A"] },
  92: { vencedor: [99, "B"] },
  93: { vencedor: [98, "A"] },
  94: { vencedor: [98, "B"] },
  95: { vencedor: [100, "A"] },
  96: { vencedor: [100, "B"] },
  97: { vencedor: [101, "A"] },
  98: { vencedor: [101, "B"] },
  99: { vencedor: [102, "A"] },
  100: { vencedor: [102, "B"] },
  101: {
    vencedor: [104, "A"],
    perdedor: [103, "A"]
  },
  102: {
    vencedor: [104, "B"],
    perdedor: [103, "B"]
  }
};

const avancosPalpite = avancosMataMata;

const ordemMataMata = [
  73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86, 87, 88,
  89, 90, 91, 92, 93, 94, 95, 96,
  97, 98, 99, 100, 101, 102, 103, 104
];

const ordemMataMataPalpite = ordemMataMata;
