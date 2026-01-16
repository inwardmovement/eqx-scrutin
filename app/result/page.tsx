"use client"

import {
  Suspense,
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  useMemo,
  useCallback,
  useId,
} from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as TooltipChart,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import Logo from "@/public/logo-eqx.webp"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Link2,
  Text,
  Plus,
  Check,
  X,
  EllipsisVertical,
  Sparkles,
  CodeXml,
  Users,
} from "lucide-react"
import { parseUrlData } from "../utils/url-format"
import { generateEmbedCode } from "../utils/embed-code"
import Script from "next/script"

type ResultData = {
  distribution: {
    [choice: string]: {
      mention: string
      score: string
      distribution: {
        [mention: string]: number
      }
    }
  }
  winner?: string
  winningMention?: string
  details?: { [key: string]: string }
}

// Ordre des mentions
const ratingOrder = [
  "Excellent",
  "Bien",
  "Passable",
  "Insuffisant",
  "À rejeter",
]

// Couleurs des mentions
const ratingColors = {
  Excellent: "#22c55e", // green-500
  Bien: "#6ee7b7", // emerald-300
  Passable: "#9ca3af", // gray-400
  Insuffisant: "#fdba74", // orange-300
  "À rejeter": "#f87171", // red-400
  Abstention: "#4b5563", // gray-600
}

const PARTICIPATION_PARAM_KEY = "c" // taille du corps électoral
const PARTICIPATION_DEBOUNCE_DELAY_MS = 200

// Calcule le nombre total de votants depuis les données de l'URL
const calculateVotersFromData = (urlData: string | null): number | null => {
  if (!urlData) return null
  try {
    const parsedData = parseUrlData(urlData)
    const firstChoice = Object.values(parsedData.distribution)[0]
    if (!firstChoice) return null
    const totalVotes = Object.entries(firstChoice.distribution)
      .filter(([mention]) => mention !== "Abstention")
      .reduce((sum, [, count]) => sum + (count as number), 0)
    return totalVotes > 0 ? totalVotes : null
  } catch (error) {
    console.error("Error parsing data:", error)
    return null
  }
}

// Analyse le paramètre de participation pour retourner les valeurs brutes
// Le paramètre "c" ne contient maintenant que la taille du corps électoral
const getParticipationInputs = (rawParam: string | null) => {
  if (!rawParam) {
    return { electorate: "" }
  }
  return { electorate: rawParam }
}

// Analyse le paramètre de participation pour retourner des nombres valides
// Le nombre de votants est calculé depuis les données de l'URL
const parseParticipationNumbers = (
  rawParam: string | null,
  urlData: string | null,
) => {
  if (!rawParam) {
    return null
  }
  const electorate = Number(rawParam)
  if (Number.isNaN(electorate) || electorate <= 0) {
    return null
  }
  const voters = calculateVotersFromData(urlData)
  if (voters === null || voters < 0) {
    return null
  }
  return { voters, electorate }
}

// Tooltip pourcentages
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const choice = label
    const distribution =
      payload[0]?.payload?.originalDistribution?.[choice]?.distribution || {}

    // Calculer le total de votes (exclure les abstentions)
    const totalVotes = Object.entries(distribution)
      .filter(([mention]) => mention !== "Abstention")
      .reduce((sum, [, count]) => sum + (count as number), 0)

    return (
      <div className="rounded bg-black p-3 shadow-lg">
        <p className="font-bold text-white">{choice}</p>
        {payload.map((entry: any, index: number) => {
          const rating = entry.name
          const votes = distribution[rating] || 0
          const percentage = Math.abs(entry.value * 100)
          // Pour l'abstention, afficher comme valeur négative
          if (rating === "Abstention") {
            return (
              <p
                key={`item-${index}`}
                className="text-sm"
                style={{ color: entry.color }}>
                {`${rating}: ${percentage.toFixed(1)}% (${votes})`}
              </p>
            )
          }
          return (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${rating}: ${percentage.toFixed(1)}% (${votes})`}
            </p>
          )
        })}
      </div>
    )
  }
  return null
}

// Légende personnalisée pour garantir que "Abstention" soit toujours en dernier
const CustomLegend = ({ payload }: any) => {
  if (!payload || !payload.length) {
    return null
  }

  // Séparer les éléments : mentions normales et Abstention
  const abstentionItem = payload.find(
    (item: any) => item.value === "Abstention",
  )
  const otherItems = payload.filter((item: any) => item.value !== "Abstention")

  // Trier les autres éléments selon l'ordre défini dans ratingOrder
  const sortedOtherItems = otherItems.sort((a: any, b: any) => {
    const indexA = ratingOrder.indexOf(a.value)
    const indexB = ratingOrder.indexOf(b.value)
    // Si un élément n'est pas dans ratingOrder, le mettre à la fin
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Réorganiser : mentions normales d'abord (dans l'ordre de ratingOrder), puis Abstention en dernier
  const orderedPayload = abstentionItem
    ? [...sortedOtherItems, abstentionItem]
    : sortedOtherItems

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {orderedPayload.map((item: any) => (
        <div
          key={item.value}
          className="[&>svg]: flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3">
          <div
            className="size-3 shrink-0 rounded-[2px]"
            style={{
              backgroundColor: item.color,
            }}
          />
          <span className="">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// Créer le contexte pour le seuil de validation
const VictoryThresholdContext = createContext<{
  victoryThreshold: string
  setVictoryThreshold: (value: string) => void
}>({
  victoryThreshold: "top_1",
  setVictoryThreshold: () => {},
})

// Hook personnalisé pour utiliser le contexte
function useVictoryThreshold() {
  return useContext(VictoryThresholdContext)
}

function ResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<ResultData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  )
  const [victoryThreshold, setVictoryThreshold] = useState(() => {
    const v = searchParams.get("v")
    if (v === "0") return "none"
    const s = searchParams.get("s")
    const n = searchParams.get("n")
    if (n) return `top_${n}`
    if (s === "1") return "excellent"
    if (s === "2") return "bien"
    if (s === "3") return "passable"
    return "top_1"
  })
  const isEmbedded = searchParams.get("d") === "embed"
  const [isParticipationOpen, setParticipationOpen] = useState(false)
  const [isDropdownMenuOpen, setDropdownMenuOpen] = useState(false)

  // Mettre à jour le seuil quand les paramètres d'URL changent
  useEffect(() => {
    const v = searchParams.get("v")
    if (v === "0") {
      setVictoryThreshold("none")
      return
    }
    const s = searchParams.get("s")
    const n = searchParams.get("n")
    if (n) setVictoryThreshold(`top_${n}`)
    else if (s === "1") setVictoryThreshold("excellent")
    else if (s === "2") setVictoryThreshold("bien")
    else if (s === "3") setVictoryThreshold("passable")
    else setVictoryThreshold("top_1")
  }, [searchParams])

  // Reset copy status after delay
  useEffect(() => {
    if (copyStatus !== "idle") {
      const timer = setTimeout(() => {
        setCopyStatus("idle")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [copyStatus])

  // Handle copying link
  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopyStatus("success")
      })
      .catch(err => {
        console.error("Failed to copy: ", err)
        setCopyStatus("error")
      })
  }

  // Handle copying text
  const handleCopyText = () => {
    if (!data) return

    // Trier les choix par score
    const sortedChoices = Object.entries(data.distribution)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))

    // Filtrer les choix gagnants
    const winningChoices = sortedChoices.filter(choice => {
      if (victoryThreshold === "none") {
        return false
      }
      if (victoryThreshold === "top_1") {
        const maxScore = Math.max(
          ...sortedChoices.map(c => parseFloat(c.score)),
        )
        return parseFloat(choice.score) === maxScore
      }

      if (victoryThreshold.startsWith("top_")) {
        const n = parseInt(victoryThreshold.split("_")[1])
        const topNChoices = sortedChoices.slice(0, n)
        return topNChoices.some(c => c.name === choice.name)
      }

      const thresholdIndex = ratingOrder.findIndex(
        mention => mention.toLowerCase() === victoryThreshold,
      )
      const choiceIndex = ratingOrder.findIndex(
        mention => mention === choice.mention,
      )
      return choiceIndex <= thresholdIndex
    })

    const hasSingleChoice = sortedChoices.length === 1
    const classementSynthese = sortedChoices
      .map((choice, index) =>
        hasSingleChoice
          ? `"${choice.name}"\nMention ${choice.mention} (${choice.score})`
          : `#${index + 1} "${choice.name}"\nMention ${choice.mention} (${choice.score})`,
      )
      .join("\n\n")

    let textToCopy = ""
    if (winningChoices.length === 0) {
      const introText = hasSingleChoice
        ? "Le scrutin a abouti à la mention suivante :"
        : "Le scrutin a abouti au classement suivant :"
      textToCopy = `${introText}\n\n${classementSynthese}`
    } else if (winningChoices.length === 1) {
      const winner = winningChoices[0]
      textToCopy = `Le scrutin a validé l'option "${winner.name}" avec la mention ${winner.mention} (${winner.score}).`
    } else {
      const hasSingleWinningChoice = winningChoices.length === 1
      textToCopy = "Le scrutin a validé les options suivantes :\n"
      winningChoices.forEach((choice, index) => {
        const rankingPrefix = hasSingleWinningChoice ? "" : `#${index + 1} `
        textToCopy += `${rankingPrefix}"${choice.name}" avec la mention ${choice.mention} (${choice.score})${index < winningChoices.length - 1 ? "\n" : ""}`
      })
    }

    if (winningChoices.length > 0 && !hasSingleChoice) {
      textToCopy += `\n\nClassement complet :\n\n${classementSynthese}`
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopyStatus("success")
      })
      .catch(err => {
        console.error("Failed to copy: ", err)
        setCopyStatus("error")
      })
  }

  // Handle copying embed code
  const handleCopyEmbedCode = () => {
    // Récupérer le paramètre data depuis searchParams (déjà décodé par le navigateur)
    const urlData = searchParams.get("data")

    // Construire l'URL sans encoder (comme dans app/page.tsx et l'API)
    // L'encodage sera fait dans generateEmbedCode
    const baseUrl = window.location.origin + window.location.pathname
    const urlParts: string[] = []

    // Ajouter le paramètre data sans encoder
    if (urlData) {
      urlParts.push(`data=${urlData}`)
    }

    // Ajouter les autres paramètres existants
    const v = searchParams.get("v")
    const s = searchParams.get("s")
    const n = searchParams.get("n")
    if (v) urlParts.push(`v=${v}`)
    if (s) urlParts.push(`s=${s}`)
    if (n) urlParts.push(`n=${n}`)

    // Ajouter le paramètre embed
    urlParts.push("d=embed")

    // Construire l'URL finale
    const embedUrl = `${baseUrl}?${urlParts.join("&")}`

    const embedCode = generateEmbedCode(embedUrl)

    navigator.clipboard
      .writeText(embedCode)
      .then(() => {
        setCopyStatus("success")
      })
      .catch(err => {
        console.error("Failed to copy: ", err)
        setCopyStatus("error")
      })
  }

  // Get button properties based on status
  const getButtonProps = () => {
    switch (copyStatus) {
      case "success":
        return {
          variant: "ghost" as const,
          icon: <Check className="text-green-600" />,
          className: "hover:bg-muted-foreground/10",
        }
      case "error":
        return {
          variant: "destructive" as const,
          icon: <X />,
          className: "hover:bg-muted-foreground/10",
        }
      default:
        return {
          variant: "ghost" as const,
          icon: <EllipsisVertical />,
          className: "hover:text-brand-light-blue hover:bg-muted-foreground/10",
        }
    }
  }

  // Handle returning home
  const handleReturnHome = () => {
    router.push("/")
  }

  return (
    <VictoryThresholdContext.Provider
      value={{ victoryThreshold, setVictoryThreshold }}>
      <main className="flex min-h-screen flex-col p-4 md:p-8">
        <div className="container mx-auto max-w-6xl">
          {!isEmbedded && (
            <div
              id="header"
              className="mb-6 flex flex-col items-center justify-between md:flex-row">
              <div className="flex flex-col items-center md:flex-row md:gap-4">
                <h1 className="text-3xl font-bold">Résultat du scrutin</h1>
                <DropdownMenu
                  modal={false}
                  open={isDropdownMenuOpen}
                  onOpenChange={setDropdownMenuOpen}>
                  <DropdownMenuTrigger
                    asChild
                    className={`${copyStatus === "success" ? "focus-visible:ring-0 focus-visible:ring-offset-0" : ""} rounded-full`}>
                    <Button
                      variant={getButtonProps().variant}
                      className={`${getButtonProps().className}`}
                      size="icon">
                      {getButtonProps().icon}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleCopyLink}
                      className="gap-2"
                      disabled={isLoading}>
                      <Link2 />
                      Copier le lien
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyText}
                      className="gap-2"
                      disabled={isLoading}>
                      <Text />
                      Copier le texte
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyEmbedCode}
                      className="gap-2"
                      disabled={isLoading}>
                      <CodeXml />
                      Copier le code
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <Suspense>
                      <ThresholdSelector />
                    </Suspense>
                    <DropdownMenuSeparator />
                    <Suspense>
                      <ParticipationMenu
                        isOpen={isParticipationOpen}
                        setIsOpen={setParticipationOpen}
                        isDropdownMenuOpen={isDropdownMenuOpen}
                      />
                    </Suspense>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleReturnHome}
                      className="gap-2"
                      disabled={isLoading}>
                      <Plus />
                      Nouveau scrutin
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Image
                src={Logo}
                alt="Logo Equinoxe"
                width={150}
                height={70}
                className="hidden md:block"
              />
            </div>
          )}

          {!isEmbedded && <Separator className="mb-8 bg-brand-light-blue" />}

          <Suspense>
            <ResultData setData={setData} setIsLoading={setIsLoading} />
          </Suspense>

          {isLoading ? (
            <LoadingContent />
          ) : data ? (
            <ResultDisplay data={data} />
          ) : null}
          {!isEmbedded && (
            <div
              id="footer"
              className="flex flex-row items-center gap-2 space-y-0 text-xs">
              <div>
                Résultat calculé au{" "}
                <Link
                  href="https://fr.wikipedia.org/wiki/Jugement_usuel"
                  target="_blank"
                  className="">
                  Jugement médian
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </VictoryThresholdContext.Provider>
  )
}

function ThresholdSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { victoryThreshold, setVictoryThreshold } = useVictoryThreshold()
  const [data, setData] = useState<ResultData | null>(null)

  // Récupérer les données du scrutin
  useEffect(() => {
    const urlData = searchParams.get("data")
    if (urlData) {
      try {
        const parsedData = parseUrlData(urlData)
        setData(parsedData)
      } catch (error) {
        console.error("Error parsing data:", error)
      }
    }
  }, [searchParams])

  // Fonction pour mettre à jour l'URL avec le nouveau seuil
  const updateThresholdInUrl = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "none") {
      params.set("v", "0")
      params.delete("s")
      params.delete("n")
    } else if (value.startsWith("top_")) {
      const n = value.split("_")[1]
      if (n === "1") {
        params.delete("n")
      } else {
        params.set("n", n)
      }
      params.delete("s")
      params.delete("v")
    } else {
      const sValue = value === "excellent" ? "1" : value === "bien" ? "2" : "3"
      params.set("s", sValue)
      params.delete("n")
      params.delete("v")
    }
    const queryString = params.toString().replace(/\+/g, "%20")
    router.push(`?${queryString}`, { scroll: false })
  }

  // Obtenir le nombre de choix dans le scrutin
  const numberOfChoices = data ? Object.keys(data.distribution).length : 0

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Sparkles />
        Validation
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={victoryThreshold}>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <em>N</em> meilleur(s) score(s)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {Array.from({ length: numberOfChoices }, (_, i) => i + 1).map(
                n => (
                  <DropdownMenuRadioItem
                    key={n}
                    value={`top_${n}`}
                    onSelect={event => {
                      event.preventDefault()
                      setVictoryThreshold(`top_${n}`)
                      updateThresholdInUrl(`top_${n}`)
                    }}>
                    {n}
                  </DropdownMenuRadioItem>
                ),
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Seuil</DropdownMenuLabel>
          <DropdownMenuRadioItem
            value="excellent"
            onSelect={event => {
              event.preventDefault()
              setVictoryThreshold("excellent")
              updateThresholdInUrl("excellent")
            }}>
            Excellent
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="bien"
            onSelect={event => {
              event.preventDefault()
              setVictoryThreshold("bien")
              updateThresholdInUrl("bien")
            }}>
            Bien
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="passable"
            onSelect={event => {
              event.preventDefault()
              setVictoryThreshold("passable")
              updateThresholdInUrl("passable")
            }}>
            Passable
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem
            value="none"
            onSelect={event => {
              event.preventDefault()
              setVictoryThreshold("none")
              updateThresholdInUrl("none")
            }}>
            Aucune
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

type ParticipationMenuProps = {
  isOpen: boolean
  setIsOpen: (value: boolean) => void
  isDropdownMenuOpen: boolean
}

function ParticipationMenu({
  isOpen,
  setIsOpen,
  isDropdownMenuOpen,
}: ParticipationMenuProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const participationParam = searchParams.get(PARTICIPATION_PARAM_KEY)
  const { electorate: initialElectorate } =
    getParticipationInputs(participationParam)
  const [electorateInput, setElectorateInput] = useState(initialElectorate)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const votersInputId = useId()
  const electorateInputId = useId()
  const invalidNumericKeys = useMemo(() => ["e", "E", "+", "-", ".", ","], [])

  // Calculer le nombre total de votants depuis les données de l'URL
  const totalVotersFromData = useMemo(() => {
    const urlData = searchParams.get("data")
    const voters = calculateVotersFromData(urlData)
    return voters !== null ? voters.toString() : ""
  }, [searchParams])

  const pushParticipationToUrl = (nextElectorate: string) => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString())
    const trimmedElectorate = nextElectorate.trim()

    if (trimmedElectorate !== "") {
      const electorateNumber = Number(trimmedElectorate)
      const isValid = !Number.isNaN(electorateNumber) && electorateNumber > 0

      if (isValid) {
        if (params.get(PARTICIPATION_PARAM_KEY) === trimmedElectorate) {
          return
        }
        params.set(PARTICIPATION_PARAM_KEY, trimmedElectorate)
        router.push(`?${params.toString()}`, { scroll: false })
        return
      }
    }

    // Supprimer le paramètre si le corps électoral est vide
    if (trimmedElectorate === "") {
      if (!params.has(PARTICIPATION_PARAM_KEY)) {
        return
      }
      params.delete(PARTICIPATION_PARAM_KEY)
      router.push(`?${params.toString()}`, { scroll: false })
    }
  }

  useEffect(() => {
    const { electorate } = getParticipationInputs(participationParam)
    setElectorateInput(prev => (prev === electorate ? prev : electorate))
  }, [participationParam])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const scheduleParticipationUpdate = (nextElectorate: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      pushParticipationToUrl(nextElectorate)
    }, PARTICIPATION_DEBOUNCE_DELAY_MS)
  }

  const handleElectorateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    setElectorateInput(nextValue)
    scheduleParticipationUpdate(nextValue)
  }

  const handlePreventInvalidInput = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (invalidNumericKeys.includes(event.key)) {
      event.preventDefault()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  const handleItemClick = (event: Event | React.SyntheticEvent) => {
    event.preventDefault()
    // Ne pas ouvrir le dialog si le menu dropdown n'est pas ouvert
    // Cela évite l'ouverture accidentelle lors de l'ouverture du menu
    if (isDropdownMenuOpen) {
      setIsOpen(true)
    }
  }

  return (
    <>
      <DropdownMenuItem className="gap-2" onSelect={handleItemClick}>
        <Users />
        Participation
      </DropdownMenuItem>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Participation</DialogTitle>
          </DialogHeader>
          <FieldGroup className="space-y-3 py-2">
            <Field className="w-full gap-1">
              <FieldLabel htmlFor={votersInputId}>Nombre de votants</FieldLabel>
              <Input
                id={votersInputId}
                type="number"
                min="0"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Nombre de votants"
                placeholder=""
                value={totalVotersFromData}
                disabled
                className="px-2 py-1.5 text-sm"
              />
            </Field>
            <Field className="w-full gap-1">
              <FieldLabel htmlFor={electorateInputId}>
                Taille du corps électoral
              </FieldLabel>
              <Input
                id={electorateInputId}
                type="number"
                min="0"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Taille du corps électoral"
                placeholder=""
                value={electorateInput}
                onChange={handleElectorateChange}
                onKeyDown={handlePreventInvalidInput}
                className="px-2 py-1.5 text-sm"
              />
            </Field>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ResultData({
  setData,
  setIsLoading,
}: {
  setData: (data: ResultData | null) => void
  setIsLoading: (loading: boolean) => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const urlData = searchParams.get("data")
    if (!urlData) {
      router.replace("/?error=no_result")
      return
    }

    try {
      const data = parseUrlData(urlData)
      setData(data)
    } catch (error) {
      console.error("Error parsing data from URL:", error)
      router.replace("/?error=invalid_data")
    } finally {
      setIsLoading(false)
    }
  }, [searchParams, router, setData, setIsLoading])

  return null
}

function LoadingContent() {
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-none bg-brand-dark-blue shadow-none">
          <CardHeader>
            <CardTitle>Classement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((_, index) => (
                <div key={index} className={`flex flex-col rounded-lg p-4`}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-brand-light-blue" />
                    <div className="flex-1">
                      <Skeleton className="mb-2 h-6 w-32 bg-brand-light-blue" />
                      <Skeleton className="h-4 w-48 bg-brand-light-blue" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-brand-dark-blue shadow-none">
          <CardHeader>
            <CardTitle>Distribution des votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <div className="flex h-full flex-col">
                {/* Zone du graphique */}
                <div className="flex-1 space-y-8 py-8">
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <Skeleton className="h-6 w-20 bg-brand-light-blue" />
                      <div className="flex-1">
                        <div className="flex h-6">
                          <Skeleton className="h-full w-[15%] rounded-none bg-brand-light-blue/50" />
                          <Skeleton className="h-full w-[20%] rounded-none bg-brand-light-blue/75" />
                          <Skeleton className="h-full w-[25%] rounded-none bg-brand-light-blue/50" />
                          <Skeleton className="h-full w-[20%] rounded-none bg-brand-light-blue/75" />
                          <Skeleton className="h-full w-[20%] rounded-none bg-brand-light-blue/50" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ResultDisplay({ data }: { data: ResultData }) {
  const { victoryThreshold } = useVictoryThreshold()
  const searchParams = useSearchParams()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [yAxisPositions, setYAxisPositions] = useState<number[]>([])
  const participationParam = searchParams.get(PARTICIPATION_PARAM_KEY)
  const urlData = searchParams.get("data")
  const participationNumbers = useMemo(
    () => parseParticipationNumbers(participationParam, urlData),
    [participationParam, urlData],
  )
  const participationRate = useMemo(() => {
    if (!participationNumbers) {
      return null
    }
    return (participationNumbers.voters / participationNumbers.electorate) * 100
  }, [participationNumbers])
  const participationRateDisplay = useMemo(() => {
    if (participationRate === null) {
      return null
    }
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(participationRate)
  }, [participationRate])
  const votersDisplay = useMemo(() => {
    if (!participationNumbers) {
      return ""
    }
    return participationNumbers.voters.toLocaleString("fr-FR")
  }, [participationNumbers])
  const electorateDisplay = useMemo(() => {
    if (!participationNumbers) {
      return ""
    }
    return participationNumbers.electorate.toLocaleString("fr-FR")
  }, [participationNumbers])

  // Trier les choix par score
  const sortedChoices = Object.entries(data.distribution)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))

  // Détecter s'il n'y a qu'un seul choix
  const hasSingleChoice = sortedChoices.length === 1

  // Fonction pour déterminer si un choix est gagnant selon le seuil
  const isWinner = (choice: (typeof sortedChoices)[0]) => {
    if (victoryThreshold === "none") {
      return false
    }
    if (victoryThreshold === "top_1") {
      const maxScore = Math.max(...sortedChoices.map(c => parseFloat(c.score)))
      return parseFloat(choice.score) === maxScore
    }

    if (victoryThreshold.startsWith("top_")) {
      const n = parseInt(victoryThreshold.split("_")[1])
      const topNChoices = sortedChoices.slice(0, n)
      return topNChoices.some(c => c.name === choice.name)
    }

    // Convertir le seuil en indice dans l'ordre des mentions
    const thresholdIndex = ratingOrder.findIndex(
      mention => mention.toLowerCase() === victoryThreshold,
    )

    // Convertir la mention du choix en indice
    const choiceIndex = ratingOrder.findIndex(
      mention => mention === choice.mention,
    )

    // Le choix est gagnant si sa mention est meilleure ou égale au seuil
    return choiceIndex <= thresholdIndex
  }

  const isThresholdValidation = ["excellent", "bien", "passable"].includes(
    victoryThreshold,
  )
  const hasValidatedOption = sortedChoices.some(choice => isWinner(choice))

  // Transform the distribution data for the stacked bar chart
  // Approche : utiliser le même stackId mais avec un offset pour l'abstention
  // L'abstention sera calculée comme une valeur qui commence à 0 et va vers la gauche
  const chartData = sortedChoices.map(choice => {
    const result: { [key: string]: any } = { name: choice.name }

    // Calculate total votes for this choice (exclure les abstentions)
    const totalVotes = Object.entries(choice.distribution)
      .filter(([mention]) => mention !== "Abstention")
      .reduce((sum, [, count]) => sum + (count as number), 0)

    const abstentionCount = choice.distribution["Abstention"] || 0
    const totalWithAbstention = totalVotes + abstentionCount

    // Store the original distribution for the tooltip
    result.originalDistribution = data.distribution

    // Calculer l'abstention comme valeur positive (proportion du total avec abstention)
    const abstentionValue =
      totalWithAbstention > 0 ? abstentionCount / totalWithAbstention : 0

    // Add each rating value to the result comme fraction du total avec abstention
    ratingOrder.forEach(rating => {
      const count = choice.distribution[rating] || 0
      result[rating] = totalWithAbstention > 0 ? count / totalWithAbstention : 0
    })

    // L'abstention est la valeur positive qui sera à droite
    result["Abstention"] = abstentionValue

    return result
  })

  // Calculer le domaine et les ticks pour l'axe X
  const hasAbstention = chartData.some(
    (entry: any) =>
      entry["Abstention"] !== undefined && entry["Abstention"] > 0,
  )
  let xAxisDomain: [number, number] = [0, 1]
  let xAxisTicks: number[] = [0, 0.25, 0.5, 0.75, 1]

  if (hasAbstention) {
    // Trouver la valeur maximale (incluant les abstentions)
    const allValues: number[] = []
    chartData.forEach((entry: any) => {
      Object.entries(entry).forEach(([key, val]: [string, any]) => {
        if (
          key !== "name" &&
          key !== "originalDistribution" &&
          typeof val === "number"
        ) {
          allValues.push(val)
        }
      })
    })
    const max = allValues.length > 0 ? Math.max(...allValues) : 1
    // Le domaine commence à 0 et va jusqu'à max avec une petite marge
    xAxisDomain = [0, max * 1.05] as [number, number]

    // Générer des ticks de 0 à max
    const step = max / 4
    xAxisTicks = []
    // 0
    xAxisTicks.push(0)
    // Ticks positifs
    for (let i = step; i <= max; i += step) {
      xAxisTicks.push(i)
    }
    xAxisTicks = xAxisTicks.sort((a, b) => a - b)
  }

  // Calculer dynamiquement les positions des libellés Y en fonction de la taille réelle du graphique
  useEffect(() => {
    if (!chartContainerRef.current) return

    const calculateYAxisPositions = () => {
      const container = chartContainerRef.current
      if (!container) return

      // Trouver l'élément SVG du graphique
      const svg = container.querySelector("svg")
      if (!svg) return

      // Trouver les lignes de la grille horizontales
      const gridLines = svg.querySelectorAll(
        'line[stroke-dasharray="3 3"]',
      ) as NodeListOf<SVGLineElement>

      if (gridLines.length === 0) return

      // Filtrer les lignes horizontales (celles qui ont y1 === y2)
      const horizontalLines = Array.from(gridLines).filter(
        line => line.getAttribute("y1") === line.getAttribute("y2"),
      )

      if (horizontalLines.length < sortedChoices.length) return

      // Obtenir la position du conteneur par rapport à la page
      const containerRect = container.getBoundingClientRect()
      const svgRect = svg.getBoundingClientRect()

      // Calculer les positions des lignes par rapport au conteneur
      const positions = horizontalLines
        .slice(0, sortedChoices.length)
        .map(line => {
          const y1 = parseFloat(line.getAttribute("y1") || "0")
          return y1 - (svgRect.top - containerRect.top)
        })

      setYAxisPositions(positions)
    }

    // Calculer initialement avec un délai pour laisser le graphique se dessiner
    const timeoutId = setTimeout(calculateYAxisPositions, 100)

    // Recalculer lors du redimensionnement
    const resizeObserver = new ResizeObserver(() => {
      // Attendre un peu pour que le graphique se redessine
      setTimeout(calculateYAxisPositions, 100)
    })

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current)
    }

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [hasAbstention, sortedChoices.length, chartData])

  return (
    <>
      <div className="mb-8 flex flex-col justify-stretch gap-6 md:flex-row">
        <Card className="w-full border-none bg-brand-dark-blue shadow-none">
          <CardHeader>
            <CardTitle>{hasSingleChoice ? "Mention" : "Classement"}</CardTitle>
          </CardHeader>
          {isThresholdValidation && !hasValidatedOption ? (
            <div className="px-4 pb-4">
              <Alert className="bg-muted-foreground/10">
                <AlertDescription>Aucune option validée</AlertDescription>
              </Alert>
            </div>
          ) : null}
          <CardContent>
            <div className="flex flex-col gap-4">
              {sortedChoices.map((choice, index) => (
                <div
                  key={choice.name}
                  className={`flex flex-col rounded-lg p-4 ${
                    isWinner(choice) ? "bg-muted-foreground/10" : ""
                  }`}>
                  <div className="flex items-center gap-3">
                    {!hasSingleChoice && (
                      <span className="text-xl font-bold">#{index + 1}</span>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {choice.name}
                      </h3>
                      <p className="text-sm">
                        Mention{" "}
                        <span
                          className="font-medium"
                          style={{
                            color:
                              ratingColors[
                                choice.mention as keyof typeof ratingColors
                              ],
                          }}>
                          {choice.mention}
                        </span>{" "}
                        ({choice.score})
                      </p>
                    </div>
                    {isWinner(choice) ? (
                      <div className="flex gap-2 text-white">
                        <span>Validation</span>
                        <Sparkles />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex w-full flex-col gap-6">
          <Card className="border-none bg-brand-dark-blue shadow-none">
            <CardHeader>
              <CardTitle>Distribution des votes</CardTitle>
            </CardHeader>
            <CardContent className="pb-0">
              <div ref={chartContainerRef} className="relative h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 40,
                      bottom: 5,
                    }}
                    stackOffset={hasAbstention ? undefined : "expand"}
                    barCategoryGap={10}
                    barSize={30}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="transparent"
                      opacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={value => {
                        return `${Math.abs(value * 100).toFixed(0)}%`
                      }}
                      domain={xAxisDomain}
                      ticks={xAxisTicks}
                      tick={{ fill: "transparent" }}
                      axisLine={false}
                      stroke="transparent"
                      hide={true}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "transparent" }}
                      tickFormatter={(value, index) =>
                        hasSingleChoice ? "" : `#${index + 1}`
                      }
                      interval={0}
                      width={0}
                      axisLine={false}
                      stroke="transparent"
                    />
                    <TooltipChart
                      content={<CustomTooltip />}
                      cursor={{ fill: "currentColor", opacity: 0.1 }}
                    />
                    <Legend content={<CustomLegend />} />
                    {/* Barres de votes (mentions) */}
                    {ratingOrder.map(rating => (
                      <Bar
                        key={rating}
                        dataKey={rating}
                        stackId="a"
                        fill={ratingColors[rating as keyof typeof ratingColors]}
                        name={rating}
                        isAnimationActive={false}
                      />
                    ))}
                    {/* Barre pour l'abstention (à droite) - même stackId pour alignement continu */}
                    {hasAbstention && (
                      <Bar
                        dataKey="Abstention"
                        stackId="a"
                        fill={ratingColors["Abstention"]}
                        name="Abstention"
                        isAnimationActive={false}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                {/* YAxis personnalisé pour l'alignement avec les lignes de la grille */}
                {yAxisPositions.length > 0 && !hasSingleChoice && (
                  <div className="absolute left-0 top-0 h-full w-[45px]">
                    {sortedChoices.map((_, index) => (
                      <div
                        key={index}
                        className="absolute flex items-center justify-end text-right text-white"
                        style={{
                          top: `${yAxisPositions[index]}px`,
                          transform: "translateY(-50%)",
                        }}>
                        #{index + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {participationRateDisplay ? (
            <Card className="border-none bg-brand-dark-blue shadow-none">
              <CardHeader>
                <CardTitle>Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <p className="text-5xl font-semibold text-white">
                    {participationRateDisplay} %
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
      <Script src="/sendIframeHeight.js" />
    </Suspense>
  )
}
