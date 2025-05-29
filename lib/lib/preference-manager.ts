import type { WorkerPreference } from "./types"

// List of all possible task types - updated to match exactly with the data in the reference image
export const TASK_TYPES = [
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
  "SUITES",
  // D9 tasks
  "KIDS+HANGOUT+ PORTAAT IMURI",
  "TORGET IMURI",
  "WC:T TORGET+PYYHINTÄ",
  "KIDS+HANGOUT+TORGET PYYHINTÄ",
  "KONFFA WC:t",
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
  "KEITTIÖ",
  "LATTIAKAIVOT",
  "WC:T 10+11", // Fixed from "VISTA WC:t 10+11"
  "VISTA WC:t 10+11",
  "IMURI LOUNGE ->",
  "IMURI CASINO ->",
  "BACKSTAGE WC:T+ PYYHINTÄ",
  "SLIDING DOOR D6/D7",
  "ROSKASTUS",
  "SMOKING ROOM + KONE",
  "MARKET EXTRA",
  // Section headings
  "TORGET",
  "CONFERNCE",
  "PORTAIKOT",
  "MARKET",
  "KEITTIÖ",
  "VISTA",
  "EXTRAS",
]

// Singleton class to manage worker preferences
export class PreferenceManager {
  private static instance: PreferenceManager
  private preferences: Map<string, string[]> = new Map()

  private constructor() {
    this.loadFromLocalStorage()
  }

  public static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager()
    }
    return PreferenceManager.instance
  }

  // Save preferences to local storage
  private saveToLocalStorage(): void {
    if (typeof window === "undefined") return

    const preferencesObj: Record<string, string[]> = {}
    this.preferences.forEach((prefs, worker) => {
      preferencesObj[worker] = prefs
    })

    localStorage.setItem("workerPreferences", JSON.stringify(preferencesObj))
  }

  // Load preferences from local storage
  private loadFromLocalStorage(): void {
    if (typeof window === "undefined") return

    const storedPrefs = localStorage.getItem("workerPreferences")
    if (storedPrefs) {
      try {
        const preferencesObj = JSON.parse(storedPrefs) as Record<string, string[]>
        Object.entries(preferencesObj).forEach(([worker, prefs]) => {
          this.preferences.set(worker, prefs)
        })
      } catch (error) {
        console.error("Error loading preferences from local storage:", error)
      }
    }
  }

  // Set preferences for a worker
  public setPreferences(workerName: string, taskPreferences: string[]): void {
    this.preferences.set(workerName, taskPreferences)
    this.saveToLocalStorage()
  }

  // Get preferences for a worker
  public getPreferences(workerName: string): string[] {
    return this.preferences.get(workerName) || []
  }

  // Remove a worker's preferences
  public removeWorkerPreferences(workerName: string): void {
    this.preferences.delete(workerName)
    this.saveToLocalStorage()
  }

  // Set preferences for multiple workers
  public setMultiplePreferences(workerPreferences: WorkerPreference[]): void {
    workerPreferences.forEach(({ workerName, taskPreferences }) => {
      this.preferences.set(workerName, taskPreferences)
    })
    this.saveToLocalStorage()
  }

  // Get all worker preferences (sorted alphabetically)
  public getAllPreferences(): WorkerPreference[] {
    const result: WorkerPreference[] = []
    this.preferences.forEach((taskPreferences, workerName) => {
      result.push({ workerName, taskPreferences })
    })

    // Sort alphabetically by worker name
    return result.sort((a, b) => a.workerName.localeCompare(b.workerName, undefined, { sensitivity: "base" }))
  }

  // Clear all preferences
  public clearAllPreferences(): void {
    this.preferences.clear()
    this.saveToLocalStorage()
  }

  // Normalize a task name for comparison
  private normalizeTaskName(taskName: string): string {
    return taskName
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/PEATUS/g, "PETAUS")
      .replace(/PYYHTINÄ/g, "PYYHINTÄ")
  }

  // Check if a task name matches a preference - STRICT WORD-TO-WORD MATCHING
  private taskMatchesPreference(taskName: string, preference: string): boolean {
    // Normalize both strings for comparison
    const normalizedTask = this.normalizeTaskName(taskName)
    const normalizedPref = this.normalizeTaskName(preference)

    console.log(`Comparing: "${normalizedTask}" with "${normalizedPref}"`)

    // 1. EXACT MATCH - Highest priority
    if (normalizedTask === normalizedPref) {
      console.log("✓ Exact match")
      return true
    }

    // 2. NUMBERED TASK MATCHING - Only for specific base tasks
    // Allow "PESU 1" to match with "PESU", but NOT "MARKET IMURI" to match with "MARKET"
    const taskWords = normalizedTask.split(" ")
    const prefWords = normalizedPref.split(" ")

    // Only allow base word matching for these specific tasks that have numbered variants
    const allowedBaseTasks = ["PESU", "PETAUS", "PYYHINTÄ"]

    if (
      taskWords.length > 1 &&
      !isNaN(Number(taskWords[taskWords.length - 1])) &&
      allowedBaseTasks.includes(taskWords[0]) &&
      taskWords[0] === prefWords.join(" ")
    ) {
      console.log(`✓ Numbered task match: "${taskWords[0]}" matches "${prefWords.join(" ")}"`)
      return true
    }

    // 3. EXACT ALTERNATIVE SPELLINGS - Very specific mappings only
    const exactAlternatives: Record<string, string[]> = {
      // Only exact alternative spellings, not partial matches
      "KIDS+HANGOUT+ PORTAAT IMURI": ["KIDS+HANGOUT+PORTAAT IMURI"],
      "IMURI LOUNGE ->": ["IMURI LOUNGE"],
      "IMURI CASINO ->": ["IMURI CASINO"],
      "WC:T 10+11": ["WC 10+11", "WC:T 10 + 11"],
      "VISTA WC:t 10+11": ["VISTA WC 10+11"],
      "SMOKING ROOM + KONE": ["SMOKING ROOM KONE"],
      "BACKSTAGE WC:T+ PYYHINTÄ": ["BACKSTAGE WC PYYHINTÄ"],
    }

    // Check if the task has exact alternatives
    if (normalizedTask in exactAlternatives) {
      for (const alternative of exactAlternatives[normalizedTask]) {
        if (normalizedPref === alternative) {
          console.log(`✓ Exact alternative match: "${normalizedTask}" -> "${alternative}"`)
          return true
        }
      }
    }

    // Check reverse alternatives
    for (const [key, alternatives] of Object.entries(exactAlternatives)) {
      if (alternatives.includes(normalizedPref) && normalizedTask === key) {
        console.log(`✓ Reverse exact alternative match: "${normalizedPref}" -> "${key}"`)
        return true
      }
    }

    console.log("✗ No match - tasks must match exactly")
    return false
  }

  // Public method to test task matching (used by assignment logic)
  public testTaskMatch(taskName: string, preference: string): boolean {
    return this.taskMatchesPreference(taskName, preference)
  }

  // ENHANCED: Get workers who prefer a specific task with FAIR priority system
  public getWorkersForTask(taskType: string): string[] {
    const workersWithPreference: {
      worker: string
      preferenceLevel: number
      workerIndex: number // For stable sorting
    }[] = []

    console.log(`Looking for workers for EXACT task: "${taskType}"`)

    // Get all workers as an array to maintain consistent ordering
    const allWorkers = Array.from(this.preferences.entries())

    allWorkers.forEach(([worker, prefs], workerIndex) => {
      // Find the first preference that EXACTLY matches this task
      for (let i = 0; i < prefs.length; i++) {
        if (this.taskMatchesPreference(taskType, prefs[i])) {
          console.log(`✓ ${worker} has EXACT match with preference "${prefs[i]}" (priority ${i + 1})`)
          workersWithPreference.push({
            worker,
            preferenceLevel: i, // Lower index = higher preference (0 = first choice, 1 = second choice, etc.)
            workerIndex, // For stable sorting when preference levels are equal
          })
          break // Only use the highest preference match
        }
      }
    })

    if (workersWithPreference.length === 0) {
      console.log(`No workers found with exact preference for task: "${taskType}"`)
    } else {
      console.log(`Found ${workersWithPreference.length} workers with exact preferences for "${taskType}"`)
    }

    // FAIR SORTING LOGIC:
    // 1. PRIMARY: Preference level (0 = first choice beats 1 = second choice, etc.)
    // 2. SECONDARY: Worker index (stable sort - maintains original order for ties)
    return workersWithPreference
      .sort((a, b) => {
        // Primary sort: Lower preference level = higher priority
        if (a.preferenceLevel !== b.preferenceLevel) {
          console.log(
            `Preference level comparison: ${a.worker} (level ${a.preferenceLevel}) vs ${b.worker} (level ${b.preferenceLevel}) - lower level wins`,
          )
          return a.preferenceLevel - b.preferenceLevel
        }

        // Secondary sort: Stable sort by worker index (first-come-first-served for ties)
        console.log(`Same preference level (${a.preferenceLevel}), using stable sort: ${a.worker} vs ${b.worker}`)
        return a.workerIndex - b.workerIndex
      })
      .map((item) => item.worker)
  }
}
