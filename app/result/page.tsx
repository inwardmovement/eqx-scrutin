"use client"

import { Suspense, useState, useEffect, createContext, useContext } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  Link2,
  Text,
  Plus,
  Check,
  X,
  EllipsisVertical,
  Sparkles,
  CodeXml,
} from "lucide-react"
import { parseUrlData } from "../utils/url-format"
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
  Excellent: "#16a34a", // green-600
  Bien: "#4ade80", // green-400
  Passable: "#d1d5db", // gray-300
  Insuffisant: "#fb923c", // orange-400 (alt #f87171 red-400)
  "À rejeter": "#ef4444", // red-500 (alt #eb2929 red-600 avec contraste amélioré)
}

// Tooltip pourcentages
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const choice = label
    const distribution =
      payload[0]?.payload?.originalDistribution?.[choice]?.distribution || {}

    return (
      <div className="rounded border bg-background p-3 shadow-lg">
        <p className="font-bold text-foreground">{choice}</p>
        {payload.map((entry: any, index: number) => {
          const rating = entry.name
          const votes = distribution[rating] || 0
          const percentage = entry.value
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
    const s = searchParams.get("s")
    const n = searchParams.get("n")
    if (n) return `top_${n}`
    if (s === "1") return "excellent"
    if (s === "2") return "bien"
    if (s === "3") return "passable"
    return "top_1"
  })
  const isEmbedded = searchParams.get("d") === "embed"

  // Mettre à jour le seuil quand les paramètres d'URL changent
  useEffect(() => {
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

    let textToCopy = ""
    if (winningChoices.length === 1) {
      const winner = winningChoices[0]
      textToCopy = `Le scrutin a validé l'option "${winner.name}" avec la mention ${winner.mention} (${winner.score}).`
    } else {
      textToCopy = "Le scrutin a validé les options suivantes :\n"
      winningChoices.forEach((choice, index) => {
        textToCopy += `#${index + 1} "${choice.name}" avec la mention ${choice.mention} (${choice.score})${index < winningChoices.length - 1 ? "\n" : ""}`
      })
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
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set("d", "embed")
    const embedUrl = currentUrl.toString()

    const embedCode = `<iframe title="Résultat du scrutin" id="iframeResize" style="border: none; width: 100%; height: 500px" src="${embedUrl}"></iframe>
    <script>
      const iframeResize = document.querySelector("#iframeResize")
      window.addEventListener("message", function (event) {
        if (event.data.type === "iframeHeight") {
          iframeResize.style.height = event.data.height + "px"
        }
      })
    </script>`

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
          className: "",
        }
      case "error":
        return {
          variant: "destructive" as const,
          icon: <X />,
          className: "",
        }
      default:
        return {
          variant: "ghost" as const,
          icon: <EllipsisVertical />,
          className: "",
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
                <DropdownMenu>
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
              className="flex flex-row items-center gap-2 space-y-0 text-xs text-muted-foreground">
              <div>
                Résultat calculé au{" "}
                <Link
                  href="https://fr.wikipedia.org/wiki/Jugement_usuel"
                  target="_blank"
                  className="text-blue-600 hover:underline">
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
    if (value.startsWith("top_")) {
      const n = value.split("_")[1]
      if (n === "1") {
        params.delete("n")
      } else {
        params.set("n", n)
      }
      params.delete("s")
    } else {
      const sValue = value === "excellent" ? "1" : value === "bien" ? "2" : "3"
      params.set("s", sValue)
      params.delete("n")
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
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
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
        <Card>
          <CardHeader>
            <CardTitle>Classement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((_, index) => (
                <div
                  key={index}
                  className={`flex flex-col rounded-lg border p-4`}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="mb-2 h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
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
                      <Skeleton className="h-6 w-20 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex h-6">
                          <Skeleton className="h-full w-[15%] rounded-none bg-muted/50" />
                          <Skeleton className="h-full w-[20%] rounded-none bg-muted/75" />
                          <Skeleton className="h-full w-[25%] rounded-none bg-muted/50" />
                          <Skeleton className="h-full w-[20%] rounded-none bg-muted/75" />
                          <Skeleton className="h-full w-[20%] rounded-none bg-muted/50" />
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

  // Trier les choix par score
  const sortedChoices = Object.entries(data.distribution)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))

  // Fonction pour déterminer si un choix est gagnant selon le seuil
  const isWinner = (choice: (typeof sortedChoices)[0]) => {
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

  // Transform the distribution data for the stacked bar chart
  // and calculate percentages
  const chartData = sortedChoices.map(choice => {
    const result: { [key: string]: any } = { name: choice.name }

    // Calculate total votes for this choice
    const totalVotes = Object.values(choice.distribution).reduce(
      (sum, count) => sum + count,
      0,
    )

    // Store the original distribution for the tooltip
    result.originalDistribution = data.distribution

    // Add each rating value to the result as a percentage
    ratingOrder.forEach(rating => {
      const count = choice.distribution[rating] || 0
      result[rating] = totalVotes > 0 ? (count / totalVotes) * 100 : 0
    })

    return result
  })

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {sortedChoices.map((choice, index) => (
                <div
                  key={choice.name}
                  className={`flex flex-col rounded-lg border p-4 ${
                    isWinner(choice) ? "border-[#ffd412]/75 bg-[#ffd412]/5" : ""
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{choice.name}</h3>
                      <p className="text-sm text-muted-foreground">
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
                      <div className="flex gap-2 text-[#ffd412]/75">
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

        <Card>
          <CardHeader>
            <CardTitle>Distribution des votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                  stackOffset="expand"
                  barCategoryGap={10}
                  barSize={30}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    opacity={0.1}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={value => `${(value * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                    ticks={[0, 0.25, 0.5, 0.75, 1]}
                    tick={{ fill: "#a3a3a3" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#a3a3a3" }}
                    tickFormatter={(value, index) => `#${index + 1}`}
                    interval={0}
                  />
                  <TooltipChart
                    content={<CustomTooltip />}
                    cursor={{ fill: "currentColor", opacity: 0.1 }}
                  />
                  <Legend />
                  {ratingOrder.map(rating => (
                    <Bar
                      key={rating}
                      dataKey={rating}
                      stackId="a"
                      fill={ratingColors[rating as keyof typeof ratingColors]}
                      name={rating}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
