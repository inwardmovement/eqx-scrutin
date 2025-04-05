"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { useToast } from "@/components/ui/use-toast"

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

export default function ResultPage() {
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copyButtonText, setCopyButtonText] = useState(
    "Copier le lien du résultat"
  )
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Use refs to track if we've already loaded data and shown toasts
  const dataLoadedRef = useRef(false)

  // Handle copying link
  const handleCopyLink = useCallback(() => {
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
        toast({
          title: "Erreur",
          description: "Impossible de copier le lien",
          variant: "destructive",
        })
      })
  }, [toast])

  // Handle returning home
  const handleReturnHome = useCallback(() => {
    router.push("/")
  }, [router])

  // Load data only once on component mount
  useEffect(() => {
    // Only run this once
    if (dataLoadedRef.current) return
    dataLoadedRef.current = true

    const encodedData = searchParams.get("data")

    if (!encodedData) {
      setLoading(false)
      router.replace("/?error=no_result")
      return
    }

    try {
      const decodedData = JSON.parse(decodeURIComponent(encodedData))
      setData(decodedData)
      setLoading(false)
    } catch (error) {
      console.error("Error parsing data from URL:", error)
      setLoading(false)
      router.replace("/?error=invalid_data")
    }
  }, []) // Empty dependency array - only run once on mount

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Chargement du résultat...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null // This should not happen as we redirect if no data
  }

  // Transform the distribution data for the stacked bar chart
  // and calculate percentages
  const chartData = Object.keys(data.distribution).map(choice => {
    const result: { [key: string]: any } = { name: choice }

    // Calculate total votes for this choice
    const totalVotes = Object.values(data.distribution[choice]).reduce(
      (sum, count) => sum + count,
      0
    )

    // Add each rating value to the result as a percentage
    ratingOrder.forEach(rating => {
      const count = data.distribution[choice][rating] || 0
      result[rating] = totalVotes > 0 ? (count / totalVotes) * 100 : 0
    })

    return result
  })

  // Custom tooltip to display percentages
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-bold">{label}</p>
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

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">
            Résultat du scrutin
          </h1>
          <div className="flex flex-col md:flex-row items-center gap-4">
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
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO_EQUINOXE_JAUNE-300x141.png-dQx5qJhppS2T2s3JctMaUuCNlyYAEA.webp"
              alt="Logo Equinoxe"
              width={150}
              height={70}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Gagnant</CardTitle>
              <CardDescription>
                Le choix qui a remporté le scrutin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Badge className="text-lg px-3 py-1 bg-[#ffd412] text-black hover:bg-[#e6c010]">
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
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickFormatter={value => `${(value * 100).toFixed(0)}%`}
                      domain={[0, 1]}
                      ticks={[0, 0.25, 0.5, 0.75, 1]}
                    />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip content={<CustomTooltip />} />
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
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="border rounded-lg p-4">
                  <dt className="font-medium text-gray-700">{key}</dt>
                  <dd className="mt-1 text-gray-500">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
