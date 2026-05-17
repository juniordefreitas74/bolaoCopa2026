function calcularPontuacaoPalpite(realA, realB, palpiteA, palpiteB) {
  const golsReaisA = Number(realA);
  const golsReaisB = Number(realB);
  const golsPalpiteA = Number(palpiteA);
  const golsPalpiteB = Number(palpiteB);

  if (
    golsPalpiteA === golsReaisA &&
    golsPalpiteB === golsReaisB
  ) {
    return 3;
  }

  if (
    golsReaisA > golsReaisB &&
    golsPalpiteA > golsPalpiteB
  ) {
    return 1;
  }

  if (
    golsReaisB > golsReaisA &&
    golsPalpiteB > golsPalpiteA
  ) {
    return 1;
  }

  if (
    golsReaisA === golsReaisB &&
    golsPalpiteA === golsPalpiteB
  ) {
    return 1;
  }

  return 0;
}
