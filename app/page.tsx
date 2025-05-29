"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, Printer, AlertCircle, Info, Eye, EyeOff, Lock, ChevronLeft, ChevronRight } from "lucide-react"
import * as XLSX from "xlsx"
import type { AreaConfig, WorkerPreference, SpecialAreaOptions } from "@/lib/types"
import { calculateAssignments, calculateWorkersNeeded } from "@/lib/assignment-logic"
import { PreferenceManager } from "@/lib/preference-manager"
import { AreaForm } from "@/components/area-form"
import { AreaTemplate } from "@/components/area-template"
import { PreferenceList } from "@/components/preference-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { globalClipboard } from "../lib/global-clipboard"

// Minimalistic SwiftUI-style Security Screen
function SecurityScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const CORRECT_PASSWORD = "Faaiz@123"

  useEffect(() => {
    // Auto-focus on password input
    passwordInputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (password === CORRECT_PASSWORD) {
      onAuthenticated()
    } else {
      setIsLoading(false)
      setError("Incorrect password")
      setPassword("")

      // Subtle shake animation
      passwordInputRef.current?.classList.add("animate-pulse")
      setTimeout(() => {
        passwordInputRef.current?.classList.remove("animate-pulse")
      }, 300)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        {/* App Icon */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Worker Assignment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Enter password to continue</p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-14 text-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-2xl px-6 pr-14 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 transition-all duration-200"
                disabled={isLoading}
                style={{
                  WebkitTextSecurity: showPassword ? "none" : "disc",
                }}
                autoComplete="current-password"
                data-lpignore="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 h-8 w-8 p-0"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
            </div>

            {error && <p className="text-red-500 text-sm font-medium px-2">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg rounded-2xl transition-all duration-200 disabled:opacity-50"
            disabled={!password || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </div>
            ) : (
              "Continue"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">Secure access required</p>
        </div>
      </div>
    </div>
  )
}

// Improved Responsive Tab Navigation Component
function ResponsiveTabsList({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { value: string; label: string }[]
  activeTab: string
  onTabChange: (value: string) => void
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollLeft = container.scrollLeft
    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth

    setCanScrollLeft(scrollLeft > 5) // Small threshold to account for rounding
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Initial check
    checkScrollButtons()

    // Add scroll listener
    container.addEventListener("scroll", checkScrollButtons)

    // Add resize listener to recheck when window resizes
    const handleResize = () => {
      setTimeout(checkScrollButtons, 100) // Small delay to ensure layout is complete
    }
    window.addEventListener("resize", handleResize)

    // Recheck when tabs change
    setTimeout(checkScrollButtons, 100)

    return () => {
      container.removeEventListener("scroll", checkScrollButtons)
      window.removeEventListener("resize", handleResize)
    }
  }, [tabs, activeTab]) // Re-run when tabs or activeTab changes

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = 200
    const newScrollLeft =
      direction === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount

    container.scrollTo({ left: newScrollLeft, behavior: "smooth" })
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {/* Left scroll button - always visible when can scroll */}
        <div className="flex-shrink-0">
          {canScrollLeft ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scroll("left")}
              className="h-8 w-8 p-0 bg-white dark:bg-gray-800 shadow-md rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-8 w-8" /> // Placeholder to maintain spacing
          )}
        </div>

        {/* Scrollable tabs container */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide flex-1"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="flex space-x-1 min-w-max px-2">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(tab.value)}
                className="whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm min-w-fit"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Right scroll button - always visible when can scroll */}
        <div className="flex-shrink-0">
          {canScrollRight ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scroll("right")}
              className="h-8 w-8 p-0 bg-white dark:bg-gray-800 shadow-md rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-8 w-8" /> // Placeholder to maintain spacing
          )}
        </div>
      </div>
    </div>
  )
}

// Main App Component with Auto-logout on close
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Auto-logout when app is closed/refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsAuthenticated(false)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Optional: logout when tab becomes hidden
        // setIsAuthenticated(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "x") {
        e.preventDefault();

        const selectedContent = getSelectedCellContent(); // Function to get the selected cell's content
        const selectedCellRef = getSelectedCellRef(); // Function to get a reference to the selected cell

        if (selectedContent && selectedCellRef) {
          const cellId = selectedCellRef.getAttribute("data-cell-id"); // Assume each cell has a unique `data-cell-id`
          if (cellId) {
            globalClipboard.cut(selectedContent, cellId, () => {
              selectedCellRef.textContent = ""; // Clear the content of the current cell
            });
          } else {
            console.warn("No cell ID found for cutting.");
          }
        } else {
          console.warn("No content selected for cutting.");
        }
      }

      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();

        const clipboardContent = globalClipboard.paste();
        const selectedCellRef = getSelectedCellRef(); // Function to get a reference to the selected cell

        if (clipboardContent && selectedCellRef) {
          selectedCellRef.textContent = clipboardContent; // Paste content into the selected cell
          globalClipboard.clearSourceCell(); // Clear the source cell after pasting
        } else {
          console.warn("No content available for pasting or no cell selected.");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  if (!isAuthenticated) {
    return <SecurityScreen onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Clean Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Worker Assignment System</h1>
        </div>
      </div>

      {/* Main Content */}
      <WorkerAssignmentPage />
    </div>
  )
}

function WorkerAssignmentPage() {
  // Update the areaConfigs state to have beds as undefined by default (not 0)
  const [areaConfigs, setAreaConfigs] = useState<AreaConfig[]>([
    { id: "8000+8300", cabins: 0, full: false },
    { id: "8100+8400", cabins: 0, full: false },
    { id: "8200+8500", cabins: 0, full: false },
    { id: "8600+8700+8800", cabins: 0, suites: { "SUITE 8626": false, "SUITE 8827": false } },
    { id: "7600+7700+7800", cabins: 0, suites: { "SUITE 7823": false, "SUITE 7622": false } },
    { id: "7500+7200+7100+7000", cabins: 0 },
    { id: "6500+6200+6100+6000", cabins: 0 },
    { id: "6600+6700+6800", cabins: 0 },
    { id: "5000+5300", cabins: 0, full: false },
    { id: "5400+5200", cabins: 0, full: false },
    { id: "5600+5700+5800", cabins: 0 },
  ])

  // Add state for special area options
  const [specialAreaOptions, setSpecialAreaOptions] = useState<SpecialAreaOptions>({
    lattiakaivot: false,
    konffahImuri: false,
    vistaDeck: false,
    terrace: false,
    terraceWorkers: 1,
  })

  const [assignments, setAssignments] = useState<any>({})
  const [activeTab, setActiveTab] = useState("upload")
  const [activeResultsTab, setActiveResultsTab] = useState("all")
  const workerFileInputRef = useRef<HTMLInputElement>(null)
  const preferenceFileInputRef = useRef<HTMLInputElement>(null)
  const [workers, setWorkers] = useState<string[]>([])
  const [preferences, setPreferences] = useState<WorkerPreference[]>([])
  const [preferenceError, setPreferenceError] = useState<string | null>(null)
  const preferenceManager = PreferenceManager.getInstance()

  // Global state for CODE and Date fields
  const [globalCode, setGlobalCode] = useState("")
  const [globalDate, setGlobalDate] = useState("")

  // Add state for drag and drop visual feedback:
  const [isDraggingWorkers, setIsDraggingWorkers] = useState(false)
  const [isDraggingPreferences, setIsDraggingPreferences] = useState(false)

  // Load preferences from local storage on initial render
  useEffect(() => {
    const storedPreferences = preferenceManager.getAllPreferences()
    setPreferences(storedPreferences)
  }, [])

  // Function to refresh preferences from storage (without affecting worker list)
  const refreshPreferences = () => {
    const storedPreferences = preferenceManager.getAllPreferences()
    setPreferences(storedPreferences)
  }

  // Calculate workers needed and remaining
  const workersNeeded = calculateWorkersNeeded(areaConfigs, specialAreaOptions)

  // Helper function to check if an area has any assignments
  const hasAssignments = (areaId: string) => {
    const areaAssignments = assignments[areaId]
    if (!areaAssignments) return false

    // Check if any non-metadata keys have assigned workers
    const hasWorkers = Object.entries(areaAssignments).some(
      ([key, worker]) => !key.startsWith("__") && worker && worker.trim() !== "",
    )

    return hasWorkers
  }

  // Calculate assignment statistics after assignments are generated
  const getAssignmentStats = () => {
    if (!assignments || Object.keys(assignments).length === 0) {
      return {
        unassignedTasks: 0,
        extraWorkers: 0,
        assignedWorkers: 0,
        hasAssignments: false,
      }
    }

    let unassignedTasks = 0
    let extraWorkers = 0
    let assignedWorkers = 0

    // Count assigned workers from all areas (except UNASSIGNED)
    Object.keys(assignments).forEach((areaId) => {
      if (areaId === "UNASSIGNED") return // Skip the unassigned workers area

      const areaAssignments = assignments[areaId]
      Object.entries(areaAssignments).forEach(([taskKey, worker]) => {
        if (!taskKey.startsWith("__") && worker && worker.trim() !== "") {
          assignedWorkers++
        } else if (!taskKey.startsWith("__") && (!worker || worker.trim() === "")) {
          unassignedTasks++
        }
      })
    })

    // Count workers in EXTRA list
    if (assignments["UNASSIGNED"]) {
      const unassignedWorkers = assignments["UNASSIGNED"]["UNASSIGNED WORKERS|workers"] || ""
      const workerEntries = unassignedWorkers.split(" | ").filter((w) => w.trim())
      extraWorkers = workerEntries.length
    }

    return {
      unassignedTasks,
      extraWorkers,
      assignedWorkers,
      hasAssignments: true,
    }
  }

  const { unassignedTasks, extraWorkers, assignedWorkers, hasAssignments: hasAnyAssignments } = getAssignmentStats()

  // Calculate theoretical vs actual remaining workers
  const theoreticalRemaining = Math.max(0, workers.length - workersNeeded)
  const actualRemaining = hasAnyAssignments ? extraWorkers : theoreticalRemaining

  const handleWorkerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // Extract worker names from first column
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      const names = jsonData.map((row) => row[0]).filter((name) => name && typeof name === "string")
      setWorkers(names)
      console.log(`📥 Loaded ${names.length} workers from file`)
    }
    reader.readAsArrayBuffer(file)
  }

  const handlePreferenceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        setPreferenceError(null)
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Extract worker preferences
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        const workerPreferences: WorkerPreference[] = []

        console.log(`📊 Processing ${jsonData.length} rows from preference file...`)

        // Process each row in the Excel file
        jsonData.forEach((row, index) => {
          if (!row[0] || typeof row[0] !== "string") {
            if (index > 0) {
              // Skip header row, but log other empty rows
              console.log(`⚠️ Row ${index + 1}: Empty or invalid worker name`)
            }
            return
          }

          const workerName = row[0].trim()
          let taskPreferences: string[] = []
          let areaPreferences: string[] = []

          // Process task preferences (column 2)
          if (row[1] && typeof row[1] === "string") {
            if (row[1].trim() === "") {
              console.log(`⚠️ Row ${index + 1}: ${workerName} has empty task preferences`)
              // Still add worker with empty preferences
              workerPreferences.push({ workerName, taskPreferences: [], areaPreferences: [] })
              return
            }

            if (row[1].includes(",")) {
              // Split the comma-separated preferences
              taskPreferences = row[1]
                .split(",")
                .map((pref) => pref.trim())
                .filter((pref) => pref.length > 0)
            } else {
              // Single preference
              taskPreferences = [row[1].trim()]
            }
          } else {
            // Extract task preferences from remaining columns (traditional method)
            for (let i = 1; i < row.length && i < 10; i++) {
              // Limit to avoid processing area column
              if (row[i] && typeof row[i] === "string") {
                const task = row[i].trim()
                if (task.length > 0) {
                  taskPreferences.push(task)
                }
              }
            }
          }

          // Process area preferences (column 3)
          if (row[2] && typeof row[2] === "string" && row[2].trim() !== "") {
            if (row[2].includes(",")) {
              // Split the comma-separated area preferences
              areaPreferences = row[2]
                .split(",")
                .map((pref) => pref.trim())
                .filter((pref) => pref.length > 0)
            } else {
              // Single area preference
              areaPreferences = [row[2].trim()]
            }
          }

          if (areaPreferences.length > 0) {
            console.log(
              `✅ Row ${index + 1}: ${workerName} → Tasks: [${taskPreferences.join(", ")}] → Areas: [${areaPreferences.join(", ")}]`,
            )
          } else {
            console.log(
              `✅ Row ${index + 1}: ${workerName} → Tasks: [${taskPreferences.join(", ")}] → No area preferences`,
            )
          }

          workerPreferences.push({ workerName, taskPreferences, areaPreferences })
        })

        console.log(`📋 Processed ${workerPreferences.length} worker preference records`)

        // Save preferences to the preference manager
        preferenceManager.setMultiplePreferences(workerPreferences)

        // Force immediate update of the preferences state
        const updatedPreferences = preferenceManager.getAllPreferences()
        setPreferences(updatedPreferences)

        console.log(`💾 Final stored preferences: ${updatedPreferences.length}`)

        // Debug: Show some examples of stored preferences
        console.log("🔍 Sample stored preferences:")
        updatedPreferences.slice(0, 5).forEach((pref) => {
          if (pref.areaPreferences && pref.areaPreferences.length > 0) {
            console.log(
              `  ${pref.workerName}: Tasks: [${pref.taskPreferences.join(", ")}] Areas: [${pref.areaPreferences.join(", ")}]`,
            )
          } else {
            console.log(`  ${pref.workerName}: Tasks: [${pref.taskPreferences.join(", ")}] No area preferences`)
          }
        })
      } catch (error) {
        console.error("Error parsing preference file:", error)
        setPreferenceError("Failed to parse preference file. Please check the format.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const clearPreferences = () => {
    if (confirm("Are you sure you want to clear all worker preferences?")) {
      preferenceManager.clearAllPreferences()
      setPreferences([])
    }
  }

  const generatePreferenceTemplate = () => {
    // All valid task names that the system recognizes
    const validTaskNames = [
      // Regular area tasks
      "ROSKAT",
      "IMURI",
      "ROSKAT+IMURI",
      "PESU",
      "PETAUS",
      "PETAUS DOUBLE",
      "PYYHINTÄ",
      "PYYHINTÄ+JAKO",
      "PYYHINTÄ + INVA JAKO",
      "REP+SETIT",
      "REP",
      "SETIT",
      "JAKO",
      "SUITES",
      "SUITE 8626",
      "SUITE 8827",
      "SUITE 7823",
      "SUITE 7622",
      // D9 tasks
      "KIDS+HANGOUT+ PORTAAT IMURI",
      "TORGET IMURI",
      "WC:T TORGET+PYYHINTÄ",
      "KIDS+HANGOUT+TORGET PYYHINTÄ",
      "KONFFA WC:t",
      "KONFFA IMURI",
      "HISSIT+KEULAPORTAAT IMURI 5-11",
      "KEULAPORTAAT PYYHINTÄ + AULAT",
      "HISSIT+KESKIPORTAAT IMURI 5-11",
      "KESKIPORTAAT PYYHINTÄ + AULAT",
      "HISSIT+PERÄPORTAAT IMURI 6-11",
      "PERÄPORTAAT PYYHINTÄ + AULAT",
      // D10 tasks
      "MARKET IMURI",
      "MARKET KONE",
      "MARKET PYYHINTÄ",
      "MARKET WC:t",
      "MARKET EXTRA",
      "KEITTIÖ",
      "LATTIAKAIVOT",
      "WC:T 10+11",
      "VISTA WC:t 10+11",
      "IMURI LOUNGE ->",
      "IMURI CASINO ->",
      "BACKSTAGE WC:T+ PYYHINTÄ",
      "SLIDING DOOR D6/D7",
      "ROSKASTUS",
      "SMOKING ROOM + KONE",
      "VISTA DECK",
      "TERRACE",
    ]

    // Valid area preferences for PESU tasks
    const validAreaPreferences = ["7 FRONT", "7 BACK", "8 FRONT", "8 BACK", "DECK 5", "6 FRONT", "6 BACK"]

    try {
      // Create workbook with template
      const wb = XLSX.utils.book_new()

      // Create template data
      const templateData = [
        [
          "Worker Name",
          "Task Preferences (comma-separated)",
          "Area Preferences for PESU (comma-separated)",
          "Instructions →",
          "Use task names from the list below, separated by commas",
          "Use area codes for PESU preferences",
        ],
        ["Example Worker 1", "PETAUS,PESU,PYYHINTÄ", "8 FRONT,7 FRONT", "", "", ""],
        ["Example Worker 2", "MARKET IMURI,KEITTIÖ,TORGET IMURI", "", "", "", ""],
        ["Example Worker 3", "PESU,PYYHINTÄ", "8 BACK,DECK 5", "", "", ""],
        ["", "", "", "", "", ""],
        ["=== YOUR WORKERS ===", "", "", "", "", ""],
        ...workers.map((worker) => [worker, "", "", "", "", ""]),
        ["", "", "", "", "", ""],
        ["=== AVAILABLE TASKS ===", "", "", "", "", ""],
        ...validTaskNames.map((task) => ["", "", "", task, "", ""]),
        ["", "", "", "", "", ""],
        ["=== AREA PREFERENCES FOR PESU ===", "", "", "", "", ""],
        ["", "", "", "7 FRONT", "= 7600+7700+7800", ""],
        ["", "", "", "7 BACK", "= 7500+7200+7100+7000", ""],
        ["", "", "", "8 FRONT", "= 8600+8700+8800", ""],
        ["", "", "", "8 BACK", "= 8000+8300, 8100+8400, 8200+8500", ""],
        ["", "", "", "DECK 5", "= 5000+5300+5400+5200, 5600+5700+5800", ""],
        ["", "", "", "6 FRONT", "= 6600+6700+6800", ""],
        ["", "", "", "6 BACK", "= 6500+6200+6100+6000", ""],
        ["", "", "", "", "", ""],
        ["", "", "", "NOTE: Area preferences only apply to PESU tasks", "", ""],
        ["", "", "", "Workers with no area preference can be assigned anywhere", "", ""],
      ]

      const ws = XLSX.utils.aoa_to_sheet(templateData)

      // Set column widths
      ws["!cols"] = [
        { width: 30 }, // Worker Name
        { width: 60 }, // Task Preferences
        { width: 40 }, // Area Preferences
        { width: 20 }, // Instructions
        { width: 50 }, // Available tasks/explanations
        { width: 30 }, // Additional info
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Worker Preferences Template")

      // Convert to binary string
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })

      // Create blob and download
      const blob = new Blob([wbout], { type: "application/octet-stream" })
      const url = URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement("a")
      link.href = url
      link.download = "worker_preferences_template_with_areas.xlsx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      URL.revokeObjectURL(url)

      console.log(
        "📥 Downloaded preference template with",
        validTaskNames.length,
        "valid task names and",
        validAreaPreferences.length,
        "area preferences",
      )
    } catch (error) {
      console.error("Error generating template:", error)

      // Fallback: Create a CSV version
      const csvContent = [
        "Worker Name,Task Preferences (comma-separated),Area Preferences for PESU (comma-separated),Instructions",
        'Example Worker 1,"PETAUS,PESU,PYYHINTÄ","8 FRONT,7 FRONT",Use task and area names from below',
        'Example Worker 2,"MARKET IMURI,KEITTIÖ,TORGET IMURI",,Separate with commas',
        'Example Worker 3,"PESU,PYYHINTÄ","8 BACK,DECK 5",Area preferences only for PESU',
        "",
        "=== YOUR WORKERS ===",
        ...workers.map((worker) => `${worker},,,`),
        "",
        "=== AVAILABLE TASKS ===",
        ...validTaskNames.map((task) => `,,,${task}`),
        "",
        "=== AREA PREFERENCES FOR PESU ===",
        ",,,7 FRONT = 7600+7700+7800",
        ",,,7 BACK = 7500+7200+7100+7000",
        ",,,8 FRONT = 8600+8700+8800",
        ",,,8 BACK = 8000+8300 8100+8400 8200+8500",
        ",,,DECK 5 = 5000+5300+5400+5200 5600+5700+5800",
        ",,,6 FRONT = 6600+6700+6800",
        ",,,6 BACK = 6500+6200+6100+6000",
      ].join("\n")

      const csvBlob = new Blob([csvContent], { type: "text/csv" })
      const csvUrl = URL.createObjectURL(csvBlob)

      const csvLink = document.createElement("a")
      csvLink.href = csvUrl
      csvLink.download = "worker_preferences_template_with_areas.csv"
      document.body.appendChild(csvLink)
      csvLink.click()
      document.body.removeChild(csvLink)

      URL.revokeObjectURL(csvUrl)

      console.log("📥 Downloaded CSV template with area preferences as fallback")
    }
  }

  // Update the updateCabinCount function to handle suite information, full option, additional workers, and beds
  const updateCabinCount = (
    areaId: string,
    cabins: number,
    suites?: { [suiteId: string]: boolean },
    full?: boolean,
    additionalWorkers?: number,
    beds?: number,
  ) => {
    setAreaConfigs((prev) =>
      prev.map((area) =>
        area.id === areaId
          ? {
              ...area,
              cabins,
              beds: beds !== undefined ? beds : area.beds,
              suites: suites !== undefined ? suites : area.suites,
              full: full !== undefined ? full : area.full,
              additionalWorkers: additionalWorkers !== undefined ? additionalWorkers : area.additionalWorkers,
            }
          : area,
      ),
    )
  }

  // Function to update special area options
  const updateSpecialAreaOption = (option: keyof SpecialAreaOptions, value: boolean | number) => {
    setSpecialAreaOptions((prev) => ({
      ...prev,
      [option]: value,
    }))
  }

  const generateAssignments = () => {
    console.log("=== STARTING ASSIGNMENT GENERATION ===")
    console.log(`Workers available: ${workers.length}`)
    console.log(`Preferences loaded: ${preferences.length}`)

    // Debug: Check specific problematic workers
    const problematicWorkers = [
      "HUSSEIN KAREEM IBRAHIM",
      "SMOLIHOVETS ALINA",
      "AHMED TAHIR",
      "AKKANAT TANJA",
      "ETTA MARYLYNE EBOT-ACHERE",
    ]

    console.log("\n🔍 Checking problematic workers:")
    problematicWorkers.forEach((worker) => {
      const isInWorkerList = workers.includes(worker)
      const prefs = preferenceManager.getPreferences(worker)
      console.log(`${worker}:`)
      console.log(`  - In worker list: ${isInWorkerList}`)
      console.log(`  - Preferences: [${prefs.join(", ")}]`)
    })

    const FULL_CAPABLE_AREAS = ["8000+8300", "8100+8400", "8200+8500", "5000+5300", "5400+5200"]

    const result = calculateAssignments(workers, areaConfigs, specialAreaOptions, FULL_CAPABLE_AREAS)
    setAssignments(result)
    setActiveTab("results")
  }

  const printAllAreas = () => {
    window.print()
  }

  // Update the printArea function to handle the new section format and include beds info
  const printArea = (areaId: string) => {
    // Check if area has assignments before printing
    if (areaId !== "UNASSIGNED" && !hasAssignments(areaId)) {
      console.log(`Skipping print for ${areaId} - no assignments`)
      return
    }

    // Handle unassigned workers page - now called "EXTRA"
    if (areaId === "UNASSIGNED") {
      const unassignedWorkers = assignments["UNASSIGNED"]?.["UNASSIGNED WORKERS|workers"] || ""
      const workerEntries = unassignedWorkers.split(" | ").filter((w) => w.trim())

      // Skip printing if no unassigned workers
      if (workerEntries.length === 0) {
        console.log("Skipping EXTRA print - no unassigned workers")
        return
      }

      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      // Extract just the worker names
      const workerNames = workerEntries
        .map((entry) => {
          let name = entry
          if (entry.includes(" (HAS PREFERENCES:")) {
            name = entry.split(" (HAS PREFERENCES:")[0]
          } else if (entry.includes(" (NO PREFERENCES PROVIDED)")) {
            name = entry.replace(" (NO PREFERENCES PROVIDED)", "")
          }
          return name.trim()
        })
        .filter((name) => name.length > 0)

      const ROWS_PER_PAGE = 27

      // Split into pages of 27 rows
      const workerPages: string[][] = []
      const workersPerPage = (ROWS_PER_PAGE - 2) * 2 // Account for MATTOPESU + REP and empty row

      for (let i = 0; i < workerNames.length; i += workersPerPage) {
        workerPages.push(workerNames.slice(i, i + workersPerPage))
      }

      let allPagesHTML = ""

      workerPages.forEach((pageWorkers, pageIndex) => {
        // Create rows with fixed structure
        const tableRows = []

        // First row: Empty and MATTOPESU + REP
        tableRows.push(`
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px; background-color: #fef3c7; font-weight: 500;">MATTOPESU + REP</td>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">EXTRA</td>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
          </tr>
        `)

        // Second row: Empty
        tableRows.push(`
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
          </tr>
        `)

        // Remaining rows: Workers (2 per row)
        for (let i = 2; i < ROWS_PER_PAGE; i++) {
          const workerIndex1 = (i - 2) * 2
          const workerIndex2 = workerIndex1 + 1
          const worker1 = pageWorkers[workerIndex1] || ""
          const worker2 = pageWorkers[workerIndex2] || ""

          tableRows.push(`
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">${worker1}</td>
              <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">${worker2}</td>
              <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">${worker1 || worker2 ? "EXTRA" : ""}</td>
              <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
            </tr>
          `)
        }

        const pageHTML = `
        <div style="page-break-before: ${pageIndex > 0 ? "always" : "auto"};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h1 style="margin: 0;">EXTRA${workerPages.length > 1 ? ` (Page ${pageIndex + 1} of ${workerPages.length})` : ""}</h1>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: bold;">Supervisor:</span>
              <div style="border: 1px solid #000; width: 120px; height: 25px;"></div>
            </div>
          </div>
          <p style="text-align: center; margin-bottom: 20px;">${workerNames.length} Workers + MATTOPESU + REP</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 38%;">Worker</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 18%;">Task</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 26%;">Area</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 18%;">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.join("")}
            </tbody>
          </table>
          <div style="display: flex; align-items: center; gap: 24px; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 14px;">CODE:</span>
              <div style="border: 1px solid #000; width: 128px; height: 32px; padding: 4px; font-size: 14px;">${globalCode}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; font-size: 14px;">Date:</span>
              <div style="border: 1px solid #000; width: 128px; height: 32px; padding: 4px; font-size: 14px;">${globalDate}</div>
            </div>
          </div>
        </div>
      `
        allPagesHTML += pageHTML
      })

      printWindow.document.write(`
<html>
  <head>
    <title>EXTRA</title>
    <style>
      body { font-family: Arial, sans-serif; }
      h1 { text-align: left; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        @page { margin: 0.5in; }
      }
    </style>
  </head>
  <body>
    ${allPagesHTML}
  </body>
</html>
`)

      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
      return
    }

    // Create a new window with just this area's content
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const areaAssignments = assignments[areaId]
    const areaConfig = areaConfigs.find((a) => a.id === areaId)

    // Build area info string including beds if available
    let areaInfo = `Area ${areaId}`
    if (areaConfig?.cabins) {
      areaInfo += ` - ${areaConfig.cabins} Cabins`
      if (areaConfig.beds) {
        areaInfo += `, ${areaConfig.beds} Beds`
      }
    }

    const ROWS_PER_PAGE = 27

    // Create rows similar to the view component
    const createPrintRows = () => {
      const rows: { worker: string; task: string; showArea: boolean }[] = []
      const hasSpecialSections = areaAssignments && areaAssignments["__sections"] !== undefined
      const sections = hasSpecialSections ? (areaAssignments["__sections"] as string[]) : []
      const isSpecialArea = areaId === "D9" || areaId === "D10"

      if (isSpecialArea) {
        // For D9/D10, process by sections
        sections.forEach((section) => {
          const sectionTasks = Object.entries(areaAssignments)
            .filter(([taskKey]) => taskKey.startsWith(`${section}|`))
            .sort(([a], [b]) => {
              const aIndex = Number.parseInt(a.split("|")[2] || "0")
              const bIndex = Number.parseInt(b.split("|")[2] || "0")
              return aIndex - bIndex
            })

          sectionTasks.forEach(([taskKey, worker]) => {
            const taskName = taskKey.split("|")[1] || taskKey
            rows.push({
              worker: worker || "",
              task: taskName,
              showArea: !!(worker || taskName),
            })
          })
        })
      } else {
        // For regular areas
        if (hasSpecialSections) {
          sections.forEach((sectionName) => {
            const sectionTasks = Object.entries(areaAssignments)
              .filter(([taskKey]) => taskKey.startsWith(`${sectionName}|`))
              .sort(([a], [b]) => {
                const aIndex = Number.parseInt(a.split("|")[2] || "0")
                const bIndex = Number.parseInt(b.split("|")[2] || "0")
                return aIndex - bIndex
              })

            sectionTasks.forEach(([taskKey, worker]) => {
              rows.push({
                worker: worker || "",
                task: sectionName,
                showArea: !!(worker || sectionName),
              })
            })
          })
        } else {
          Object.entries(areaAssignments)
            .filter(([key]) => !key.startsWith("__"))
            .forEach(([taskKey, worker]) => {
              const taskName = taskKey.split("|")[1] || taskKey
              rows.push({
                worker: worker || "",
                task: taskName,
                showArea: !!(worker || taskName),
              })
            })
        }
      }

      return rows
    }

    const allRows = createPrintRows()

    // Split into pages of 27 rows
    const assignmentPages: (typeof allRows)[] = []
    for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
      const pageRows = allRows.slice(i, i + ROWS_PER_PAGE)
      // Pad to exactly 27 rows
      while (pageRows.length < ROWS_PER_PAGE) {
        pageRows.push({ worker: "", task: "", showArea: false })
      }
      assignmentPages.push(pageRows)
    }

    // If no content, create one empty page
    if (assignmentPages.length === 0) {
      const emptyPage: typeof allRows = []
      for (let i = 0; i < ROWS_PER_PAGE; i++) {
        emptyPage.push({ worker: "", task: "", showArea: false })
      }
      assignmentPages.push(emptyPage)
    }

    let allPagesHTML = ""

    assignmentPages.forEach((pageAssignments, pageIndex) => {
      const pageHTML = `
      <div style="page-break-before: ${pageIndex > 0 ? "always" : "auto"};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h1 style="margin: 0;">${areaInfo}${assignmentPages.length > 1 ? ` (Page ${pageIndex + 1} of ${assignmentPages.length})` : ""}</h1>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: bold;">Supervisor:</span>
            <div style="border: 1px solid #000; width: 120px; height: 25px;"></div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;" class="${areaId === "D9" || areaId === "D10" ? "special-area" : ""}">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 38%;" class="col-worker">Worker</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 18%;" class="col-task">Task</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 26%;" class="col-area">Area</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold; width: 18%;" class="col-signature">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${pageAssignments
              .map(
                ({ worker, task, showArea }) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">${worker}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">${task}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; height: 25px;">${showArea ? areaId : ""}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; height: 25px;"></td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
        <div style="display: flex; align-items: center; gap: 24px; margin-top: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; font-size: 14px;">CODE:</span>
            <div style="border: 1px solid #000; width: 128px; height: 32px; padding: 4px; font-size: 14px;">${globalCode}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; font-size: 14px;">Date:</span>
            <div style="border: 1px solid #000; width: 128px; height: 32px; padding: 4px; font-size: 14px;">${globalDate}</div>
          </div>
        </div>
      </div>
    `
      allPagesHTML += pageHTML
    })

    printWindow.document.write(`
<html>
  <head>
    <title>Area ${areaId}</title>
    <style>
      body { font-family: Arial, sans-serif; }
      h1 { text-align: left; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        @page { margin: 0.5in; }
      }
      .special-area .col-worker { width: 35% !important; }
      .special-area .col-task { width: 45% !important; }
      .special-area .col-area { width: 8% !important; }
      .special-area .col-signature { width: 12% !important; }
    </style>
  </head>
  <body>
    ${allPagesHTML}
  </body>
</html>
`)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  // Add state for duplicate checking
  const [duplicateWorkers, setDuplicateWorkers] = useState<Set<string>>(new Set())

  // Function to check for duplicates across all areas
  const checkForDuplicates = () => {
    const allWorkerNames: string[] = []
    const duplicates = new Set<string>()

    // Collect all worker names from all areas
    Object.keys(assignments).forEach((areaId) => {
      if (areaId === "UNASSIGNED") {
        // Handle EXTRA area
        const unassignedWorkers = assignments["UNASSIGNED"]["UNASSIGNED WORKERS|workers"] || ""
        const workerEntries = unassignedWorkers.split(" | ").filter((w) => w.trim())
        const workerNames = workerEntries
          .map((entry) => {
            let name = entry
            if (entry.includes(" (HAS PREFERENCES:")) {
              name = entry.split(" (HAS PREFERENCES:")[0]
            } else if (entry.includes(" (NO PREFERENCES PROVIDED)")) {
              name = entry.replace(" (NO PREFERENCES PROVIDED)", "")
            }
            return name.trim()
          })
          .filter((name) => name.length > 0 && name !== "MATTOPESU + REP")

        allWorkerNames.push(...workerNames)
      } else {
        // Handle regular areas
        const areaAssignments = assignments[areaId]
        if (areaAssignments) {
          Object.entries(areaAssignments).forEach(([taskKey, worker]) => {
            if (!taskKey.startsWith("__") && worker && typeof worker === "string" && worker.trim() !== "") {
              const workerName = worker.trim()
              if (!workerName.startsWith("=== ") && !workerName.endsWith(" ===")) {
                allWorkerNames.push(workerName)
              }
            }
          })
        }
      }
    })

    // Find duplicates
    const nameCounts: { [name: string]: number } = {}
    allWorkerNames.forEach((name) => {
      nameCounts[name] = (nameCounts[name] || 0) + 1
      if (nameCounts[name] > 1) {
        duplicates.add(name)
      }
    })

    setDuplicateWorkers(duplicates)

    if (duplicates.size > 0) {
      alert(`Found ${duplicates.size} duplicate worker(s): ${Array.from(duplicates).join(", ")}`)
    } else {
      alert("No duplicate workers found!")
    }
  }

  // Create tabs for results section - change "Unassigned" to "EXTRA"
  const resultsTabs = [
    { value: "all", label: "All Areas" },
    { value: "unassigned", label: "EXTRA" },
    { value: "d9", label: "D9" },
    { value: "d10", label: "D10" },
    ...areaConfigs.map((area) => ({ value: area.id, label: area.id })),
  ]

  // Drag and drop handlers for worker list
  const handleWorkerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleWorkerDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingWorkers(true)
  }

  const handleWorkerDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingWorkers(false)
    }
  }

  const handleWorkerDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingWorkers(false)

    const files = Array.from(e.dataTransfer.files)
    const excelFile = files.find((file) => file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))

    if (excelFile) {
      // Update the file input to show the selected file
      if (workerFileInputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(excelFile)
        workerFileInputRef.current.files = dataTransfer.files
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Extract worker names from first column
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        const names = jsonData.map((row) => row[0]).filter((name) => name && typeof name === "string")
        setWorkers(names)
        console.log(`📥 Loaded ${names.length} workers from dropped file`)
      }
      reader.readAsArrayBuffer(excelFile)
    }
  }

  // Drag and drop handlers for preferences
  const handlePreferenceDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handlePreferenceDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingPreferences(true)
  }

  const handlePreferenceDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingPreferences(false)
    }
  }

  const handlePreferenceDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingPreferences(false)

    const files = Array.from(e.dataTransfer.files)
    const excelFile = files.find((file) => file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))

    if (excelFile) {
      // Update the file input to show the selected file
      if (preferenceFileInputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(excelFile)
        preferenceFileInputRef.current.files = dataTransfer.files
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          setPreferenceError(null)
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          // Extract worker preferences
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
          const workerPreferences: WorkerPreference[] = []

          console.log(`📊 Processing ${jsonData.length} rows from dropped preference file...`)

          // Process each row in the Excel file
          jsonData.forEach((row, index) => {
            if (!row[0] || typeof row[0] !== "string") {
              if (index > 0) {
                // Skip header row, but log other empty rows
                console.log(`⚠️ Row ${index + 1}: Empty or invalid worker name`)
              }
              return
            }

            const workerName = row[0].trim()
            let taskPreferences: string[] = []
            let areaPreferences: string[] = []

            // Process task preferences (column 2)
            if (row[1] && typeof row[1] === "string") {
              if (row[1].trim() === "") {
                console.log(`⚠️ Row ${index + 1}: ${workerName} has empty task preferences`)
                // Still add worker with empty preferences
                workerPreferences.push({ workerName, taskPreferences: [], areaPreferences: [] })
                return
              }

              if (row[1].includes(",")) {
                // Split the comma-separated preferences
                taskPreferences = row[1]
                  .split(",")
                  .map((pref) => pref.trim())
                  .filter((pref) => pref.length > 0)
              } else {
                // Single preference
                taskPreferences = [row[1].trim()]
              }
            } else {
              // Extract task preferences from remaining columns (traditional method)
              for (let i = 1; i < row.length && i < 10; i++) {
                // Limit to avoid processing area column
                if (row[i] && typeof row[i] === "string") {
                  const task = row[i].trim()
                  if (task.length > 0) {
                    taskPreferences.push(task)
                  }
                }
              }
            }

            // Process area preferences (column 3)
            if (row[2] && typeof row[2] === "string" && row[2].trim() !== "") {
              if (row[2].includes(",")) {
                // Split the comma-separated area preferences
                areaPreferences = row[2]
                  .split(",")
                  .map((pref) => pref.trim())
                  .filter((pref) => pref.length > 0)
              } else {
                // Single area preference
                areaPreferences = [row[2].trim()]
              }
            }

            if (areaPreferences.length > 0) {
              console.log(
                `✅ Row ${index + 1}: ${workerName} → Tasks: [${taskPreferences.join(", ")}] → Areas: [${areaPreferences.join(", ")}]`,
              )
            } else {
              console.log(
                `✅ Row ${index + 1}: ${workerName} → Tasks: [${taskPreferences.join(", ")}] → No area preferences`,
              )
            }

            workerPreferences.push({ workerName, taskPreferences, areaPreferences })
          })

          console.log(`📋 Processed ${workerPreferences.length} worker preference records`)

          // Save preferences to the preference manager
          preferenceManager.setMultiplePreferences(workerPreferences)

          // Force immediate update of the preferences state
          const updatedPreferences = preferenceManager.getAllPreferences()
          setPreferences(updatedPreferences)

          console.log(`💾 Final stored preferences: ${updatedPreferences.length}`)

          // Debug: Show some examples of stored preferences
          console.log("🔍 Sample stored preferences:")
          updatedPreferences.slice(0, 5).forEach((pref) => {
            if (pref.areaPreferences && pref.areaPreferences.length > 0) {
              console.log(
                `  ${pref.workerName}: Tasks: [${pref.taskPreferences.join(", ")}] Areas: [${pref.areaPreferences.join(", ")}]`,
              )
            } else {
              console.log(`  ${pref.workerName}: Tasks: [${pref.taskPreferences.join(", ")}] No area preferences`)
            }
          })
        } catch (error) {
          console.error("Error parsing dropped preference file:", error)
          setPreferenceError("Failed to parse preference file. Please check the format.")
        }
      }
      reader.readAsArrayBuffer(excelFile)
    }
  }

  return (
    <div className="zoom-responsive-container mx-auto py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. Upload Workers</TabsTrigger>
          <TabsTrigger value="configure">2. Configure Areas</TabsTrigger>
          <TabsTrigger value="results">3. View Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Worker List</CardTitle>
              <CardDescription>Upload an Excel file containing the list of workers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="worker-upload">Worker List (Required)</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      isDraggingWorkers
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    onDragOver={handleWorkerDragOver}
                    onDragEnter={handleWorkerDragEnter}
                    onDragLeave={handleWorkerDragLeave}
                    onDrop={handleWorkerDrop}
                  >
                    <div className="text-center">
                      <Upload
                        className={`mx-auto h-8 w-8 mb-2 ${isDraggingWorkers ? "text-blue-500" : "text-gray-400"}`}
                      />
                      <p
                        className={`text-sm font-medium mb-1 ${isDraggingWorkers ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {isDraggingWorkers ? "Drop Excel file here" : "Drag & drop Excel file here"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">or</p>
                      <div className="flex gap-2">
                        <Input
                          id="worker-upload"
                          type="file"
                          accept=".xlsx,.xls"
                          ref={workerFileInputRef}
                          onChange={handleWorkerFileUpload}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={() => workerFileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Browse
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload an Excel file with worker names in the first column
                  </p>
                </div>

                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="preference-upload">Worker Preference List (Optional)</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      isDraggingPreferences
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    onDragOver={handlePreferenceDragOver}
                    onDragEnter={handlePreferenceDragEnter}
                    onDragLeave={handlePreferenceDragLeave}
                    onDrop={handlePreferenceDrop}
                  >
                    <div className="text-center">
                      <Upload
                        className={`mx-auto h-8 w-8 mb-2 ${isDraggingPreferences ? "text-green-500" : "text-gray-400"}`}
                      />
                      <p
                        className={`text-sm font-medium mb-1 ${isDraggingPreferences ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {isDraggingPreferences ? "Drop Excel file here" : "Drag & drop Excel file here"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">or</p>
                      <div className="flex gap-2">
                        <Input
                          id="preference-upload"
                          type="file"
                          accept=".xlsx,.xls"
                          ref={preferenceFileInputRef}
                          onChange={handlePreferenceFileUpload}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={() => preferenceFileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Browse
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload an Excel file with worker names in the first column, comma-separated task preferences in the
                    second column, and area preferences for PESU in the third column (Deck 5, 6 Back, 7 Back, 8 Back, 6
                    Front, 7 Front, 8 Front)
                  </p>
                </div>

                {preferenceError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{preferenceError}</AlertDescription>
                  </Alert>
                )}

                <Separator />

                {workers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Uploaded Workers ({workers.length})</h3>
                    <ScrollArea className="h-[200px] border rounded-md p-4">
                      <ul className="space-y-1">
                        {workers.map((worker, index) => (
                          <li key={index} className="text-sm">
                            {worker}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                {preferences.length > 0 && (
                  <div className="mt-4">
                    <PreferenceList
                      preferences={preferences}
                      onClearPreferences={clearPreferences}
                      onPreferencesUpdated={refreshPreferences}
                    />
                  </div>
                )}

                {workers.length > 0 && (
                  <Button className="mt-4" onClick={() => setActiveTab("configure")}>
                    Continue to Area Configuration
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure Areas</CardTitle>
              <CardDescription>Enter the number of cabins and beds for each area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Worker Assignment Info</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1">
                      <div>
                        You have <span className="font-medium">{workers.length} workers available</span>. Current
                        configuration needs <span className="font-medium">{workersNeeded} workers</span>.
                      </div>

                      {/* Show different messages based on whether assignments have been generated */}
                      {!hasAnyAssignments ? (
                        // Before assignment generation - show theoretical calculation
                        <div>
                          {theoreticalRemaining > 0 ? (
                            <span className="text-blue-600 font-medium">
                              Estimated {theoreticalRemaining} workers will remain unassigned.
                            </span>
                          ) : theoreticalRemaining < 0 ? (
                            <span className="text-red-600 font-medium">
                              You need {Math.abs(theoreticalRemaining)} more workers.
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">Estimated perfect assignment.</span>
                          )}
                        </div>
                      ) : (
                        // After assignment generation - show actual results
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <div className="text-sm space-y-1">
                            <div className="font-medium text-gray-700">Actual Assignment Results:</div>
                            <div className="text-green-600">
                              <span className="font-medium">{assignedWorkers} workers</span> successfully assigned
                            </div>
                            {extraWorkers > 0 && (
                              <div className="text-blue-600">
                                <span className="font-medium">{extraWorkers} workers</span> are on EXTRA list
                              </div>
                            )}
                            {unassignedTasks > 0 && (
                              <div className="text-orange-600">
                                <span className="font-medium">{unassignedTasks} tasks</span> are without workers
                              </div>
                            )}
                            {unassignedTasks === 0 && extraWorkers === 0 && (
                              <div className="text-green-600 font-medium">Perfect assignment - all tasks filled!</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {areaConfigs.map((area) => (
                    <AreaForm
                      key={area.id}
                      area={area}
                      onChange={(cabins, suites, full, additionalWorkers, beds) =>
                        updateCabinCount(area.id, cabins, suites, full, additionalWorkers, beds)
                      }
                    />
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Special Areas</h3>
                    <p className="text-sm text-muted-foreground">
                      Areas D9 and D10 have predefined tasks and don't require cabin counts
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Optional Tasks</CardTitle>
                      <CardDescription className="text-sm">
                        Select additional tasks to include in the assignments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="lattiakaivot"
                              checked={specialAreaOptions.lattiakaivot}
                              onCheckedChange={(checked) => updateSpecialAreaOption("lattiakaivot", checked === true)}
                            />
                            <Label htmlFor="lattiakaivot" className="text-sm font-normal">
                              LATTIAKAIVOT
                            </Label>
                            <span className="text-xs text-muted-foreground">(KEITTIÖ section)</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="konffahImuri"
                              checked={specialAreaOptions.konffahImuri}
                              onCheckedChange={(checked) => updateSpecialAreaOption("konffahImuri", checked === true)}
                            />
                            <Label htmlFor="konffahImuri" className="text-sm font-normal">
                              KONFFA IMURI
                            </Label>
                            <span className="text-xs text-muted-foreground">(CONFERNCE section)</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="vistaDeck"
                              checked={specialAreaOptions.vistaDeck}
                              onCheckedChange={(checked) => updateSpecialAreaOption("vistaDeck", checked === true)}
                            />
                            <Label htmlFor="vistaDeck" className="text-sm font-normal">
                              VISTA DECK
                            </Label>
                            <span className="text-xs text-muted-foreground">(VISTA section)</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="terrace"
                                checked={specialAreaOptions.terrace}
                                onCheckedChange={(checked) => updateSpecialAreaOption("terrace", checked === true)}
                              />
                              <Label htmlFor="terrace" className="text-sm font-normal">
                                TERRACE
                              </Label>
                              <span className="text-xs text-muted-foreground">(EXTRAS section)</span>
                            </div>
                            {specialAreaOptions.terrace && (
                              <div className="pl-6">
                                <Label htmlFor="terraceWorkers" className="text-xs text-muted-foreground">
                                  Number of workers:
                                </Label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Checkbox
                                    id="terrace1"
                                    checked={specialAreaOptions.terraceWorkers === 1}
                                    onCheckedChange={(checked) =>
                                      checked && updateSpecialAreaOption("terraceWorkers", 1)
                                    }
                                  />
                                  <Label htmlFor="terrace1" className="text-xs">
                                    1 worker
                                  </Label>
                                  <Checkbox
                                    id="terrace2"
                                    checked={specialAreaOptions.terraceWorkers === 2}
                                    onCheckedChange={(checked) =>
                                      checked && updateSpecialAreaOption("terraceWorkers", 2)
                                    }
                                  />
                                  <Label htmlFor="terrace2" className="text-xs">
                                    2 workers
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("upload")}>
                    Back
                  </Button>
                  <Button onClick={generateAssignments}>Generate Assignments</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Worker Assignments</CardTitle>
                <CardDescription>Review and print worker assignments for each area</CardDescription>
              </div>
              <Button onClick={printAllAreas}>
                <Printer className="h-4 w-4 mr-2" />
                Print All Areas
              </Button>
            </CardHeader>
            <CardContent>
              {/* Assignment Statistics - Show in Results Tab */}
              {hasAnyAssignments && (
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Assignment Summary</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-700">Assignment Results:</div>
                      <div className="text-green-600">
                        <span className="font-medium">{assignedWorkers} workers</span> successfully assigned
                      </div>
                      {extraWorkers > 0 && (
                        <div className="text-blue-600">
                          <span className="font-medium">{extraWorkers} workers</span> are on EXTRA list
                        </div>
                      )}
                      {unassignedTasks > 0 && (
                        <div className="text-orange-600">
                          <span className="font-medium">{unassignedTasks} tasks</span> are without workers
                        </div>
                      )}
                      {unassignedTasks === 0 && extraWorkers === 0 && (
                        <div className="text-green-600 font-medium">Perfect assignment - all tasks filled!</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Navigation Help Note */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">Navigation Tip:</span> To access the horizontal slider and navigate
                    through all area pages, select <span className="font-semibold">"All Areas"</span> tab. Individual
                    area tabs show only that specific area.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Responsive Tab Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <ResponsiveTabsList
                    tabs={resultsTabs}
                    activeTab={activeResultsTab}
                    onTabChange={setActiveResultsTab}
                  />
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                  {activeResultsTab === "all" && (
                    <div className="flex overflow-x-auto dynamic-spacing pb-4 horizontal-scroll print:block print:space-y-6">
                      {/* Show all regular areas first in the specified order */}
                      {Object.keys(assignments)
                        .filter((areaId) => areaId !== "UNASSIGNED" && assignments[areaId] && hasAssignments(areaId))
                        .sort((a, b) => {
                          // Define the exact order we want
                          const order = [
                            "D9",
                            "D10",
                            "8000+8300",
                            "8100+8400",
                            "8200+8500",
                            "8600+8700+8800",
                            "7600+7700+7800",
                            "7500+7200+7100+7000",
                            "6500+6200+6100+6000",
                            "6600+6700+6800",
                            "5000+5300",
                            "5400+5200",
                            "5600+5700+5800",
                          ]

                          const indexA = order.indexOf(a)
                          const indexB = order.indexOf(b)

                          // If both are in the order array, sort by their position
                          if (indexA !== -1 && indexB !== -1) {
                            return indexA - indexB
                          }

                          // If only one is in the order array, prioritize it
                          if (indexA !== -1) return -1
                          if (indexB !== -1) return 1

                          // If neither is in the order array, sort alphabetically
                          return a.localeCompare(b)
                        })
                        .map((areaId) => (
                          <div key={areaId} className="flex gap-6">
                            <AreaTemplate
                              areaId={areaId}
                              cabins={areaConfigs.find((a) => a.id === areaId)?.cabins || 0}
                              assignments={assignments[areaId]}
                              onPrint={() => printArea(areaId)}
                              globalCode={globalCode}
                              globalDate={globalDate}
                              onCodeChange={setGlobalCode}
                              onDateChange={setGlobalDate}
                              duplicateWorkers={duplicateWorkers}
                            />
                          </div>
                        ))}

                      {/* Show UNASSIGNED (EXTRA) at the very end */}
                      {assignments["UNASSIGNED"] && (
                        <div className="flex gap-6">
                          <AreaTemplate
                            areaId="UNASSIGNED"
                            cabins={0}
                            assignments={assignments["UNASSIGNED"]}
                            onPrint={() => printArea("UNASSIGNED")}
                            globalCode={globalCode}
                            globalDate={globalDate}
                            onCodeChange={setGlobalCode}
                            onDateChange={setGlobalDate}
                            duplicateWorkers={duplicateWorkers}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeResultsTab === "unassigned" &&
                    (assignments["UNASSIGNED"] ? (
                      <AreaTemplate
                        areaId="UNASSIGNED"
                        cabins={0}
                        assignments={assignments["UNASSIGNED"]}
                        onPrint={() => printArea("UNASSIGNED")}
                        globalCode={globalCode}
                        globalDate={globalDate}
                        onCodeChange={setGlobalCode}
                        onDateChange={setGlobalDate}
                        duplicateWorkers={duplicateWorkers}
                      />
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">All workers have been assigned!</p>
                        </CardContent>
                      </Card>
                    ))}

                  {activeResultsTab === "d9" && hasAssignments("D9") && (
                    <AreaTemplate
                      areaId="D9"
                      cabins={0}
                      assignments={assignments["D9"]}
                      onPrint={() => printArea("D9")}
                      globalCode={globalCode}
                      globalDate={globalDate}
                      onCodeChange={setGlobalCode}
                      onDateChange={setGlobalDate}
                      duplicateWorkers={duplicateWorkers}
                    />
                  )}

                  {activeResultsTab === "d10" && hasAssignments("D10") && (
                    <AreaTemplate
                      areaId="D10"
                      cabins={0}
                      assignments={assignments["D10"]}
                      onPrint={() => printArea("D10")}
                      globalCode={globalCode}
                      globalDate={globalDate}
                      onCodeChange={setGlobalCode}
                      onDateChange={setGlobalDate}
                      duplicateWorkers={duplicateWorkers}
                    />
                  )}

                  {areaConfigs.map(
                    (area) =>
                      activeResultsTab === area.id &&
                      hasAssignments(area.id) && (
                        <AreaTemplate
                          key={area.id}
                          areaId={area.id}
                          cabins={area.cabins}
                          assignments={assignments[area.id]}
                          onPrint={() => printArea(area.id)}
                          globalCode={globalCode}
                          globalDate={globalDate}
                          onCodeChange={setGlobalCode}
                          onDateChange={setGlobalDate}
                          duplicateWorkers={duplicateWorkers}
                        />
                      ),
                  )}

                  {/* Show message if area has no assignments */}
                  {activeResultsTab !== "all" &&
                    activeResultsTab !== "unassigned" &&
                    assignments[activeResultsTab] &&
                    !hasAssignments(activeResultsTab) && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">No workers assigned to {activeResultsTab}</p>
                        </CardContent>
                      </Card>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
