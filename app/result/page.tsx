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
  Newspaper,
  Check,
  X,
  EllipsisVertical,
} from "lucide-react"

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
  "Bien",
  "Passable",
  "Insuffisant",
  "À rejeter",
]

// Define colors for each rating
const ratingColors = {
  Excellent: "#9acd32", // yellowgreen
  Bien: "#1e8e3e", // darker green
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
                  disabled={isLoading}
                  className={`${getButtonProps().className}`}
                  size="icon">
                  {getButtonProps().icon}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink} className="gap-1">
                  <Link2 className="mr-2 h-4 w-4" />
                  Copier le lien
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyText} className="gap-1">
                  <Text className="mr-2 h-4 w-4" />
                  Copier le texte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReturnHome} className="gap-1">
                  <Newspaper className="mr-2 h-4 w-4" />
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
  }, [searchParams, router, setData, setIsLoading])

  return null
}

function LoadingContent() {
  return (
    <>
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
    </>
  )
}

function ResultDisplay({ data }: { data: ResultData }) {
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
    <>
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
    </>
  )
}

export default function ResultPage() {
  return <ResultContent />
}
