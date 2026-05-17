function iniciarTimeClassificacao(grupo, time) {
  if (!grupo[time]) {
    grupo[time] = {
      time,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0
    };
  }
}

function aplicarResultadoClassificacao(
  grupo,
  timeA,
  timeB,
  golA,
  golB
) {
  grupo[timeA].jogos++;
  grupo[timeB].jogos++;

  grupo[timeA].golsPro += golA;
  grupo[timeA].golsContra += golB;
  grupo[timeB].golsPro += golB;
  grupo[timeB].golsContra += golA;

  grupo[timeA].saldo =
  grupo[timeA].golsPro -
  grupo[timeA].golsContra;

  grupo[timeB].saldo =
  grupo[timeB].golsPro -
  grupo[timeB].golsContra;

  if (golA > golB) {
    grupo[timeA].pontos += 3;
    grupo[timeA].vitorias++;
    grupo[timeB].derrotas++;
  } else if (golB > golA) {
    grupo[timeB].pontos += 3;
    grupo[timeB].vitorias++;
    grupo[timeA].derrotas++;
  } else {
    grupo[timeA].pontos++;
    grupo[timeB].pontos++;
    grupo[timeA].empates++;
    grupo[timeB].empates++;
  }
}

function ordenarClassificacao(a, b) {
  return b.pontos - a.pontos ||
  b.vitorias - a.vitorias ||
  b.saldo - a.saldo ||
  b.golsPro - a.golsPro ||
  a.time.localeCompare(b.time);
}
