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

type Distribution = {
  [mention: string]: number
}

type Choice = {
  mention: string
  score: string
  distribution: Distribution
}

type ScrutinData = {
  distribution: {
    [choice: string]: Choice
  }
  winner?: string
  winningMention?: string
  details?: { [key: string]: string }
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
    return `${encodedName}-${mentionShortcut}-${distributionString}-${choice.score}`
  })

  // Joint tous les choix avec le caractère '_'
  return choices.join("_")
}

// Parse les données de l'URL vers le format d'origine
export function parseUrlData(urlData: string): ScrutinData {
  const distribution: { [choice: string]: Choice } = {}
  let bestScore = -Infinity
  let winner = ""
  let winningMention = ""

  const choices = urlData.split("_")
  for (const choice of choices) {
    const [encodedName, mentionShortcut, distributionString, score] =
      choice.split("-")

    // Décode le nom du choix
    const name = decodeURIComponent(encodedName)

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
    const scoreNum = parseFloat(score)

    // Met à jour le gagnant si nécessaire
    if (scoreNum > bestScore) {
      bestScore = scoreNum
      winner = name
      winningMention = mention
    }

    distribution[name] = {
      mention,
      score,
      distribution: distributionData,
    }
  }

  // Calcule le nombre total de votants
  const totalVotes = Object.values(distribution).reduce((total, choice) => {
    const choiceTotal = Object.values(choice.distribution).reduce(
      (sum, count) => sum + count,
      0,
    )
    return Math.max(total, choiceTotal)
  }, 0)

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
