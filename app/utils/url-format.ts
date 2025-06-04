import { type ScrutinData, type Distribution, type Choice } from "../actions"

// Mapping des mentions vers leurs abréviations
export const MENTION_SHORTCUTS: { [key: string]: string } = {
  Excellent: "E",
  Bien: "B",
  Passable: "P",
  Insuffisant: "I",
  "À rejeter": "R",
}

// Mapping des abréviations vers les mentions complètes
export const MENTION_FULL: { [key: string]: string } = {
  E: "Excellent",
  B: "Bien",
  P: "Passable",
  I: "Insuffisant",
  R: "À rejeter",
}

// Convertit les données du scrutin en format URL
export function formatDataForUrl(data: ScrutinData): string {
  const choices = Object.entries(data.distribution).map(([name, choice]) => {
    // Encode le nom du choix
    const encodedName = encodeURIComponent(name)

    // Obtient l'abréviation de la mention majoritaire
    const mentionShortcut = MENTION_SHORTCUTS[choice.mention]

    // Crée la chaîne de distribution
    const distributionString = Object.entries(choice.distribution)
      .map(([mention, count]) => `${MENTION_SHORTCUTS[mention]}${count}`)
      .join("")

    // Retourne le format demandé pour ce choix
    return `${encodedName}~${mentionShortcut}~${distributionString}~${choice.score}`
  })

  // Joint tous les choix avec le caractère '_'
  return choices.join("_")
}

// Parse les données de l'URL vers le format d'origine
export function parseUrlData(urlData: string): ScrutinData {
  const distribution: { [choice: string]: Choice } = {}

  const choices = urlData.split("_")
  for (const choice of choices) {
    const [encodedName, mentionShortcut, distributionString, score] =
      choice.split("~")

    // Remplace les + par des espaces avant de décoder
    const name = decodeURIComponent(encodedName.replace(/\+/g, " "))

    // Parse la distribution
    const distributionData: Distribution = {}
    let currentIndex = 0
    while (currentIndex < distributionString.length) {
      const mentionShortcut = distributionString[currentIndex]
      let countStr = ""
      currentIndex++
      while (
        currentIndex < distributionString.length &&
        !isNaN(Number(distributionString[currentIndex]))
      ) {
        countStr += distributionString[currentIndex]
        currentIndex++
      }
      const mention = MENTION_FULL[mentionShortcut]
      distributionData[mention] = Number(countStr)
    }

    const mention = MENTION_FULL[mentionShortcut]

    distribution[name] = {
      mention,
      score,
      distribution: distributionData,
    }
  }

  // Récupérer le gagnant (celui avec le meilleur score)
  let bestScore = -Infinity
  let winner = ""
  let winningMention = ""

  Object.entries(distribution).forEach(([name, choice]) => {
    const scoreNum = parseFloat(choice.score)
    if (scoreNum > bestScore) {
      bestScore = scoreNum
      winner = name
      winningMention = choice.mention
    }
  })

  // Calculer le nombre de votants à partir du premier choix
  const firstChoice = Object.values(distribution)[0]
  const totalVotes = firstChoice
    ? Object.values(firstChoice.distribution).reduce(
        (a: number, b: number) => a + b,
        0,
      )
    : 0

  return {
    distribution,
    winner,
    winningMention,
    details: {
      "Méthode de calcul": "Jugement usuel",
      "Nombre de votants": totalVotes.toString(),
    },
  }
}
