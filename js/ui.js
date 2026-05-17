const bandeiras = {
  "mexico": "mx",
  "africa do sul": "za",
  "coreia do sul": "kr",
  "tchequia": "cz",
  "canada": "ca",
  "catar": "qa",
  "suica": "ch",
  "bosnia e herzegovina": "ba",
  "brasil": "br",
  "haiti": "ht",
  "marrocos": "ma",
  "escocia": "gb-sct",
  "estados unidos": "us",
  "paraguai": "py",
  "australia": "au",
  "turquia": "tr",
  "alemanha": "de",
  "curacao": "cw",
  "costa do marfim": "ci",
  "equador": "ec",
  "holanda": "nl",
  "japao": "jp",
  "suecia": "se",
  "tunisia": "tn",
  "belgica": "be",
  "egito": "eg",
  "ira": "ir",
  "nova zelandia": "nz",
  "espanha": "es",
  "cabo verde": "cv",
  "arabia saudita": "sa",
  "uruguai": "uy",
  "franca": "fr",
  "senegal": "sn",
  "iraque": "iq",
  "noruega": "no",
  "argentina": "ar",
  "argelia": "dz",
  "austria": "at",
  "jordania": "jo",
  "portugal": "pt",
  "congo dr": "cd",
  "uzbequistao": "uz",
  "colombia": "co",
  "inglaterra": "gb-eng",
  "croacia": "hr",
  "gana": "gh",
  "panama": "pa"
};

function normalizarNome(nome) {
  if (!nome) {
    return "";
  }

  return String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function renderizarTime(nome) {
  const codigo =
  bandeiras[normalizarNome(nome)];

  if (!codigo) {
    return `<span>${nome || "A definir"}</span>`;
  }

  return `
    <span class="time-com-bandeira">
      <img
        src="https://flagcdn.com/w40/${codigo}.png"
        alt="Bandeira de ${nome}"
      >
      <span>${nome}</span>
    </span>
  `;
}

function formatarData(dataISO) {
  if (!dataISO || dataISO === "sem-data") {
    return "Data a definir";
  }

  if (
    typeof dataISO === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dataISO)
  ) {
    const partes = dataISO.split("-");

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const data = new Date(dataISO);

  return data.toLocaleDateString("pt-BR");
}

function formatarHora(horaISO) {
  if (!horaISO) {
    return "";
  }

  if (
    typeof horaISO === "string" &&
    horaISO.includes(":") &&
    !horaISO.includes("T")
  ) {
    return horaISO.slice(0, 5);
  }

  const hora = new Date(horaISO);

  return hora.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function obterChaveData(dataISO) {
  if (!dataISO) {
    return "sem-data";
  }

  const data = new Date(dataISO);

  return data.toISOString().slice(0, 10);
}

function temResultado(jogo) {
  return jogo.gol_a !== "" &&
    jogo.gol_a !== null &&
    jogo.gol_a !== undefined &&
    jogo.gol_b !== "" &&
    jogo.gol_b !== null &&
    jogo.gol_b !== undefined;
}
