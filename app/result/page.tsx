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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import Logo from "@/public/logo-eqx.webp"

type Distribution = {
  [choice: string]: {
    [rating: string]: number
  }
}

type ResultData = {
  distribution: Distribution
  winner: string
  winningMention: string
  details: { [key: string]: string }
}

// Define the order of ratings for consistent display
const ratingOrder = [
  "Excellent",
  "Très bien",
  "Bien",
  "Assez bien",
  "Passable",
  "Insuffisant",
  "À rejeter",
]

// Define colors for each rating
const ratingColors = {
  Excellent: "#1e8e3e", // darker green
  "Très bien": "#4ade80", // green-400
  Bien: "#9acd32", // yellowgreen
  "Assez bien": "#ffd700", // yellow
  Passable: "#ffa500", // orange
  Insuffisant: "#f87171", // red-400
  "À rejeter": "#ffffff", // white
}

// Custom tooltip to display percentages
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border bg-background p-3 shadow-lg">
        <p className="font-bold text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toFixed(1)}%`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function ResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copyButtonText, setCopyButtonText] = useState(
    "Copier le lien du résultat",
  )
  const [data, setData] = useState<ResultData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const encodedData = searchParams.get("data")
    if (!encodedData) {
      router.replace("/?error=no_result")
      return
    }

    try {
      const decodedData = JSON.parse(decodeURIComponent(encodedData))
      if (!decodedData) {
        router.replace("/?error=invalid_data")
        return
      }
      setData(decodedData)
    } catch (error) {
      console.error("Error parsing data from URL:", error)
      router.replace("/?error=invalid_data")
    } finally {
      setIsLoading(false)
    }
  }, [searchParams, router])

  // Handle copying link
  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopyButtonText("Lien copié")
        setTimeout(() => {
          setCopyButtonText("Copier le lien du résultat")
        }, 2000)
      })
      .catch(err => {
        console.error("Failed to copy: ", err)
        toast.error("Impossible de copier le lien")
      })
  }

  // Handle returning home
  const handleReturnHome = () => {
    router.push("/")
  }

  // Si les données sont en cours de chargement, afficher les skeletons
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col p-4 md:p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
            <h1 className="mb-4 text-3xl font-bold md:mb-0">
              Résultat du scrutin
            </h1>
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div className="w-[195px] text-center">
                <Button variant="ghost" className="w-full" disabled>
                  Copier le lien du résultat
                </Button>
              </div>
              <Button className="md:mr-3" variant="ghost" disabled>
                Nouveau scrutin
              </Button>
              <Image src={Logo} alt="Logo Equinoxe" width={150} height={70} />
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gagnant</CardTitle>
                <CardDescription>
                  Le choix qui a remporté le scrutin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-32 items-center justify-center">
                  <div className="space-y-4 text-center">
                    <Skeleton className="mx-auto h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution des votes</CardTitle>
                <CardDescription>
                  Répartition des évaluations par choix (en pourcentage)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Skeleton className="h-full w-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations supplémentaires</CardTitle>
              <CardDescription>
                Détail du départage des égalités avec la méthode du{" "}
                <Link
                  href="https://fr.wikipedia.org/wiki/Jugement_usuel"
                  target="_blank"
                  className="text-blue-600 hover:underline">
                  Jugement usuel
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((_, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // Si pas de données après le chargement, ne rien afficher
  if (!data) {
    return null
  }

  // Transform the distribution data for the stacked bar chart
  // and calculate percentages
  const chartData = Object.keys(data.distribution).map(choice => {
    const result: { [key: string]: any } = { name: choice }

    // Calculate total votes for this choice
    const totalVotes = Object.values(data.distribution[choice]).reduce(
      (sum: number, count: number) => sum + count,
      0,
    )

    // Add each rating value to the result as a percentage
    ratingOrder.forEach(rating => {
      const count = data.distribution[choice][rating] || 0
      result[rating] = totalVotes > 0 ? (count / totalVotes) * 100 : 0
    })

    return result
  })

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
          <h1 className="mb-4 text-3xl font-bold md:mb-0">
            Résultat du scrutin
          </h1>
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <div className="w-[195px] text-center">
              <Button
                onClick={handleCopyLink}
                variant="ghost"
                className="w-full">
                {copyButtonText}
              </Button>
            </div>
            <Button
              className="md:mr-3"
              onClick={handleReturnHome}
              variant="ghost">
              Nouveau scrutin
            </Button>
            <Image src={Logo} alt="Logo Equinoxe" width={150} height={70} />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gagnant</CardTitle>
              <CardDescription>
                Le choix qui a remporté le scrutin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center">
                <div className="text-center">
                  <Badge className="bg-[#ffd412] px-3 py-1 text-lg text-black hover:bg-[#e6c010]">
                    {data.winner}
                  </Badge>
                  <p className="mt-2 text-sm text-gray-500">
                    a remporté le scrutin avec la mention{" "}
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          ratingColors[
                            data.winningMention as keyof typeof ratingColors
                          ],
                      }}>
                      {data.winningMention}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution des votes</CardTitle>
              <CardDescription>
                Répartition des évaluations par choix (en pourcentage)
              </CardDescription>
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
                      // stroke="currentColor"
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      // stroke="currentColor"
                    />
                    <Tooltip
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

        <Card>
          <CardHeader>
            <CardTitle>Informations supplémentaires</CardTitle>
            <CardDescription>
              Détail du départage des égalités avec la méthode du{" "}
              <Link
                href="https://fr.wikipedia.org/wiki/Jugement_usuel"
                target="_blank"
                className="text-blue-600 hover:underline">
                Jugement usuel
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="rounded-lg border p-4">
                  <dt className="font-medium text-gray-700">{key}</dt>
                  <dd className="mt-1 text-gray-500">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <Card className="w-full max-w-6xl">
            <CardContent className="flex min-h-[50vh] items-center justify-center">
              <Spinner className="size-12" />
            </CardContent>
          </Card>
        </main>
      }>
      <ResultContent />
    </Suspense>
  )
}
