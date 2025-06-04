// Mapping des mentions vers leurs abréviations
export const MENTION_SHORTCUTS: { [key: string]: string } = {
  "Très bien": "TB",
  Bien: "B",
  "Assez bien": "AB",
  Passable: "P",
  Insuffisant: "I",
  "À rejeter": "R",
}

// Mapping des abréviations vers les mentions complètes
export const MENTION_FULL: { [key: string]: string } = {
  TB: "Très bien",
  B: "Bien",
  AB: "Assez bien",
  P: "Passable",
  I: "Insuffisant",
  R: "À rejeter",
}

// Couleurs des mentions
export const RATING_COLORS = {
  "Très bien": "#16a34a", // green-600
  Bien: "#4ade80", // green-400
  "Assez bien": "#bbf7d0", // green-200
  Passable: "#d1d5db", // gray-300
  Insuffisant: "#fb923c", // orange-400
  "À rejeter": "#ef4444", // red-500
}

// Ordre des mentions
export const RATING_ORDER = [
  "Très bien",
  "Bien",
  "Assez bien",
  "Passable",
  "Insuffisant",
  "À rejeter",
]

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
  winner: string
  winningMention: string
  details: { [key: string]: string }
}

// Convertit les données du scrutin en format URL
export function formatDataForUrl(data: ScrutinData): string {
  const choices = Object.entries(data.distribution).map(([name, choice]) => {
    // Encoder tous les caractères spéciaux
    const encodedName = encodeURIComponent(name)

    // Vérifier que la mention est valide
    if (!MENTION_SHORTCUTS[choice.mention]) {
      throw new Error(`Mention invalide trouvée: ${choice.mention}`)
    }

    const mentionShortcut = MENTION_SHORTCUTS[choice.mention]
    const distributionString = Object.entries(choice.distribution)
      .map(([mention, count]) => {
        // Vérifier que chaque mention dans la distribution est valide
        if (!MENTION_SHORTCUTS[mention]) {
          throw new Error(`Mention invalide dans la distribution: ${mention}`)
        }
        return `${MENTION_SHORTCUTS[mention]}${count}`
      })
      .join("")
    return `${encodedName}~${mentionShortcut}~${distributionString}~${choice.score}`
  })
  return choices.join("_")
}

// Parse les données de l'URL vers le format d'origine
export function parseUrlData(urlData: string): ScrutinData {
  const distribution: { [choice: string]: Choice } = {}

  const choices = urlData.split("_")
  for (const choice of choices) {
    const parts = choice.split("~")
    if (parts.length < 4) {
      console.error(`Format de données invalide: ${choice}`)
      continue
    }

    const [encodedName, mentionShortcut, distributionString, score] = parts
    // Décoder tous les caractères spéciaux
    const name = decodeURIComponent(encodedName)

    // Vérifier si la mention est valide
    const mention = MENTION_FULL[mentionShortcut]
    if (!mention) {
      console.error(
        `Mention non trouvée pour l'abréviation: ${mentionShortcut}`,
      )
      continue
    }

    const distributionData: Distribution = {}
    let currentIndex = 0
    while (currentIndex < distributionString.length) {
      // Vérifier si c'est une abréviation à deux lettres (AB, TB)
      let currentMentionShortcut = distributionString[currentIndex]
      if (currentIndex + 1 < distributionString.length) {
        const nextChar = distributionString[currentIndex + 1]
        if (
          nextChar === "B" &&
          (currentMentionShortcut === "A" || currentMentionShortcut === "T")
        ) {
          currentMentionShortcut += "B"
          currentIndex++
        }
      }
      currentIndex++

      let countStr = ""
      while (
        currentIndex < distributionString.length &&
        !isNaN(Number(distributionString[currentIndex]))
      ) {
        countStr += distributionString[currentIndex]
        currentIndex++
      }
      const distributionMention = MENTION_FULL[currentMentionShortcut]
      if (distributionMention) {
        distributionData[distributionMention] = Number(countStr)
      }
    }

    distribution[name] = {
      mention,
      score,
      distribution: distributionData,
    }
  }

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

  const totalVotes = Object.values(distribution)[0]?.distribution
    ? Object.values(Object.values(distribution)[0].distribution).reduce(
        (a, b) => a + b,
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
