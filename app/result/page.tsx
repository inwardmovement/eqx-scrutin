"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dropdown-menu"
import {
  Link2,
  Text,
  ChartLine,
  Check,
  X,
  EllipsisVertical,
} from "lucide-react"
import { parseUrlData } from "../utils/format"

type Distribution = {
  [choice: string]: {
    [rating: string]: number
  }
}

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
  Excellent: "#84cc16", // lime-500
  Bien: "#059169", // emerald-700 avec contraste amélioré
  Passable: "#fb923c", // orange-400
  Insuffisant: "#f6204f", // rose-600 avec contraste amélioré
  "À rejeter": "#ffffff", // white
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

function ResultContent() {
  const router = useRouter()
  const [data, setData] = useState<ResultData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  )

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
    navigator.clipboard
      .writeText("Résultat en texte")
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
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
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
                  onClick={handleReturnHome}
                  className="gap-2"
                  disabled={isLoading}>
                  <ChartLine />
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

        <Suspense>
          <ResultData setData={setData} setIsLoading={setIsLoading} />
        </Suspense>

        {isLoading ? (
          <LoadingContent />
        ) : data ? (
          <ResultDisplay data={data} />
        ) : null}
      </div>
    </main>
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
                    <Skeleton className="h-8 w-8" />
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
              <Skeleton className="h-full w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ResultDisplay({ data }: { data: ResultData }) {
  // Trier les choix par score
  const sortedChoices = Object.entries(data.distribution)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))

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
                    index === 0 ? "border-[#ffd412]/75 bg-[#ffd412]/5" : ""
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
                        · Score : {choice.score}
                      </p>
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
                  />
                  <YAxis dataKey="name" type="category" />
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
  return <ResultContent />
}
