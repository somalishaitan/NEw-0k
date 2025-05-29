import type { WorkerPreference } from "./types"

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
  "MATTOPESU + REP",
]

// Add area preference mapping at the top after TASK_TYPES
const AREA_PREFERENCE_MAPPING: Record<string, string[]> = {
  "7 FRONT": ["7600+7700+7800"],
  "7 BACK": ["7500+7200+7100+7000"],
  "8 FRONT": ["8600+8700+8800"],
  "8 BACK": ["8000+8300", "8100+8400", "8200+8500"],
  "DECK 5": ["5000+5300", "5400+5200", "5600+5700+5800"],
  "6 FRONT": ["6600+6700+6800"],
  "6 BACK": ["6500+6200+6100+6000"],
}

export class PreferenceManager {
  private static instance: PreferenceManager
  private preferences: Map<string, string[]> = new Map()
  private areaPreferences: Map<string, string[]> = new Map() // New map for area preferences
  private pyyhintaPreferences: Map<string, string[]> = new Map() // New map for pyyhinta preferences

  private constructor() {
    // this.loadFromLocalStorage()
  }

  public static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager()
    }
    return PreferenceManager.instance
  }

  private saveToLocalStorage(): void {
    if (typeof window === "undefined") return

    const preferencesObj: Record<string, string[]> = {}
    this.preferences.forEach((prefs, worker) => {
      preferencesObj[worker] = prefs
    })

    const areaPreferencesObj: Record<string, string[]> = {}
    this.areaPreferences.forEach((prefs, worker) => {
      areaPreferencesObj[worker] = prefs
    })

    const pyyhintaPreferencesObj: Record<string, string[]> = {}
    this.pyyhintaPreferences.forEach((prefs, worker) => {
      pyyhintaPreferencesObj[worker] = prefs
    })

    localStorage.setItem("workerPreferences", JSON.stringify(preferencesObj))
    localStorage.setItem("workerAreaPreferences", JSON.stringify(areaPreferencesObj))
    localStorage.setItem("workerPyyhintaPreferences", JSON.stringify(pyyhintaPreferencesObj))
  }

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

    const storedAreaPrefs = localStorage.getItem("workerAreaPreferences")
    if (storedAreaPrefs) {
      try {
        const areaPreferencesObj = JSON.parse(storedAreaPrefs) as Record<string, string[]>
        Object.entries(areaPreferencesObj).forEach(([worker, prefs]) => {
          this.areaPreferences.set(worker, prefs)
        })
      } catch (error) {
        console.error("Error loading area preferences from local storage:", error)
      }
    }

    const storedPyyhintaPrefs = localStorage.getItem("workerPyyhintaPreferences")
    if (storedPyyhintaPrefs) {
      try {
        const pyyhintaPreferencesObj = JSON.parse(storedPyyhintaPrefs) as Record<string, string[]>
        Object.entries(pyyhintaPreferencesObj).forEach(([worker, prefs]) => {
          this.pyyhintaPreferences.set(worker, prefs)
        })
      } catch (error) {
        console.error("Error loading pyyhinta preferences from local storage:", error)
      }
    }
  }

  // Enhanced name normalization
  private normalizeWorkerName(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/[^\w\s]/g, "") // Remove special characters except spaces
  }

  // Enhanced name variations for better matching
  private getNameVariations(name: string): string[] {
    const normalized = this.normalizeWorkerName(name)
    const words = normalized.split(" ").filter((w) => w.length > 0)

    const variations = [
      normalized, // Original normalized
      words.join(" "), // Just in case normalization changed something
    ]

    // Add reversed name variations (First Last vs Last First)
    if (words.length >= 2) {
      // Try different combinations
      const reversed = [...words].reverse()
      variations.push(reversed.join(" ")) // Reverse order
      variations.push(`${words[words.length - 1]} ${words.slice(0, -1).join(" ")}`) // Last name first
      variations.push(`${words.slice(1).join(" ")} ${words[0]}`) // First name last
    }

    // Remove duplicates
    return [...new Set(variations)]
  }

  // Enhanced fuzzy matching
  private findMatchingWorkerName(targetName: string): string | null {
    const targetVariations = this.getNameVariations(targetName)

    // First try exact matches
    for (const variation of targetVariations) {
      if (this.preferences.has(variation)) {
        return variation
      }
    }

    // Then try fuzzy matching against all stored names
    const storedNames = Array.from(this.preferences.keys())

    for (const storedName of storedNames) {
      const storedVariations = this.getNameVariations(storedName)

      // Check if any variation of target matches any variation of stored
      for (const targetVar of targetVariations) {
        for (const storedVar of storedVariations) {
          if (targetVar === storedVar) {
            console.log(`🔗 Name match found: "${targetName}" → "${storedName}"`)
            return storedName
          }
        }
      }
    }

    return null
  }

  public setPreferences(workerName: string, taskPreferences: string[]): void {
    const normalizedName = this.normalizeWorkerName(workerName)
    this.preferences.set(normalizedName, taskPreferences)
    // this.saveToLocalStorage()
  }

  public getPreferences(workerName: string): string[] {
    // Try direct lookup first
    const directMatch = this.preferences.get(workerName)
    if (directMatch) {
      return directMatch
    }

    // Try normalized lookup
    const normalizedName = this.normalizeWorkerName(workerName)
    const normalizedMatch = this.preferences.get(normalizedName)
    if (normalizedMatch) {
      return normalizedMatch
    }

    // Try fuzzy matching
    const matchingName = this.findMatchingWorkerName(workerName)
    if (matchingName) {
      return this.preferences.get(matchingName) || []
    }

    // No match found - this is now tracked in diagnostics
    return []
  }

  // Enhanced method to get preferences with better name matching
  public getPreferencesWithMatching(workerName: string): { preferences: string[]; matchedName: string | null } {
    // Try direct lookup first
    const directMatch = this.preferences.get(workerName)
    if (directMatch) {
      return { preferences: directMatch, matchedName: workerName }
    }

    // Try normalized lookup
    const normalizedName = this.normalizeWorkerName(workerName)
    const normalizedMatch = this.preferences.get(normalizedName)
    if (normalizedMatch) {
      return { preferences: normalizedMatch, matchedName: normalizedName }
    }

    // Try fuzzy matching
    const matchingName = this.findMatchingWorkerName(workerName)
    if (matchingName) {
      const prefs = this.preferences.get(matchingName) || []
      return { preferences: prefs, matchedName: matchingName }
    }

    return { preferences: [], matchedName: null }
  }

  // Method to find all workers from uploaded list who have preferences
  public getWorkersWithPreferences(uploadedWorkers: string[]): {
    withPreferences: string[]
    withoutPreferences: string[]
    matches: { uploaded: string; preference: string }[]
  } {
    const withPreferences: string[] = []
    const withoutPreferences: string[] = []
    const matches: { uploaded: string; preference: string }[] = []

    uploadedWorkers.forEach((uploadedWorker) => {
      const result = this.getPreferencesWithMatching(uploadedWorker)

      if (result.preferences.length > 0 && result.matchedName) {
        withPreferences.push(uploadedWorker)
        matches.push({ uploaded: uploadedWorker, preference: result.matchedName })
      } else {
        withoutPreferences.push(uploadedWorker)
      }
    })

    return { withPreferences, withoutPreferences, matches }
  }

  public removeWorkerPreferences(workerName: string): void {
    this.preferences.delete(workerName)
    // this.saveToLocalStorage()
  }

  // Add method to get actual area IDs from preference
  private getAreaIdsFromPreference(areaPreference: string): string[] {
    const normalizedPref = areaPreference.trim().toUpperCase()
    return AREA_PREFERENCE_MAPPING[normalizedPref] || []
  }

  // Update setMultiplePreferences method to handle area and pyyhinta preferences
  public setMultiplePreferences(workerPreferences: WorkerPreference[]): void {
    console.log(`📥 Loading ${workerPreferences.length} worker preferences...`)

    workerPreferences.forEach(({ workerName, taskPreferences, areaPreferences, pyyhintaPreferences }) => {
      const normalizedName = this.normalizeWorkerName(workerName)
      this.preferences.set(normalizedName, taskPreferences)

      if (areaPreferences && areaPreferences.length > 0) {
        this.areaPreferences.set(normalizedName, areaPreferences)
      }

      if (pyyhintaPreferences && pyyhintaPreferences.length > 0) {
        this.pyyhintaPreferences.set(normalizedName, pyyhintaPreferences)
      }

      console.log(
        `✅ Loaded preferences for: "${normalizedName}" - Tasks: [${taskPreferences.join(", ")}]${
          areaPreferences ? ` - Areas: [${areaPreferences.join(", ")}]` : ""
        }${pyyhintaPreferences ? ` - Pyyhinta: [${pyyhintaPreferences.join(", ")}]` : ""}`,
      )
    })

    // this.saveToLocalStorage()
    // console.log(`💾 Saved ${this.preferences.size} worker preferences to storage`)
  }

  // Add method to get area preferences for a worker
  public getAreaPreferences(workerName: string): string[] {
    // Try direct lookup first
    const directMatch = this.areaPreferences.get(workerName)
    if (directMatch) {
      return directMatch
    }

    // Try normalized lookup
    const normalizedName = this.normalizeWorkerName(workerName)
    const normalizedMatch = this.areaPreferences.get(normalizedName)
    if (normalizedMatch) {
      return normalizedMatch
    }

    // Try fuzzy matching
    const matchingName = this.findMatchingWorkerName(workerName)
    if (matchingName) {
      return this.areaPreferences.get(matchingName) || []
    }

    return []
  }

  // Add method to get pyyhinta preferences for a worker
  public getPyyhintaPreferences(workerName: string): string[] {
    // Try direct lookup first
    const directMatch = this.pyyhintaPreferences.get(workerName)
    if (directMatch) {
      return directMatch
    }

    // Try normalized lookup
    const normalizedName = this.normalizeWorkerName(workerName)
    const normalizedMatch = this.pyyhintaPreferences.get(normalizedName)
    if (normalizedMatch) {
      return normalizedMatch
    }

    // Try fuzzy matching
    const matchingName = this.findMatchingWorkerName(workerName)
    if (matchingName) {
      return this.pyyhintaPreferences.get(matchingName) || []
    }

    return []
  }

  public getAllPreferences(): WorkerPreference[] {
    const result: WorkerPreference[] = []
    this.preferences.forEach((taskPreferences, workerName) => {
      const areaPreferences = this.areaPreferences.get(workerName) || []
      const pyyhintaPreferences = this.pyyhintaPreferences.get(workerName) || []
      result.push({ workerName, taskPreferences, areaPreferences, pyyhintaPreferences })
    })

    return result.sort((a, b) => a.workerName.localeCompare(b.workerName, undefined, { sensitivity: "base" }))
  }

  public clearAllPreferences(): void {
    this.preferences.clear()
    this.areaPreferences.clear()
    this.pyyhintaPreferences.clear()
  }

  // Enhanced task name normalization
  private normalizeTaskName(taskName: string): string {
    return taskName
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/PEATUS/g, "PETAUS")
      .replace(/PYYHTINÄ/g, "PYYHINTÄ")
      .replace(/MATTOPESU/g, "PESU") // Handle this common variation
  }

  // Strict word-to-word task matching - NO partial matches allowed
  private taskMatchesPreference(taskName: string, preference: string): boolean {
    const normalizedTask = this.normalizeTaskName(taskName)
    const normalizedPref = this.normalizeTaskName(preference)

    console.log(`🔍 Strict matching: "${normalizedTask}" vs "${normalizedPref}"`)

    // 1. EXACT MATCH ONLY - Most strict
    if (normalizedTask === normalizedPref) {
      console.log("✅ Exact match")
      return true
    }

    // 2. NUMBERED TASK MATCHING - Only for specific base tasks with numbers
    const taskWords = normalizedTask.split(" ")
    const prefWords = normalizedPref.split(" ")
    const allowedBaseTasks = ["PESU", "PETAUS", "PYYHINTÄ", "REP"]

    if (
      taskWords.length > 1 &&
      !isNaN(Number(taskWords[taskWords.length - 1])) &&
      allowedBaseTasks.includes(taskWords[0]) &&
      taskWords[0] === prefWords.join(" ")
    ) {
      console.log(`✅ Numbered task match: "${taskWords[0]}" with number`)
      return true
    }

    // 3. ONLY EXACT ALTERNATIVE SPELLINGS - Very limited set
    const exactAlternatives: Record<string, string[]> = {
      "KIDS+HANGOUT+ PORTAAT IMURI": ["KIDS+HANGOUT+PORTAAT IMURI"],
      "IMURI LOUNGE ->": ["IMURI LOUNGE"],
      "IMURI CASINO ->": ["IMURI CASINO"],
      "WC:T 10+11": ["WC 10+11"],
      "VISTA WC:t 10+11": ["VISTA WC 10+11"],
      "SMOKING ROOM + KONE": ["SMOKING ROOM KONE"],
      "BACKSTAGE WC:T+ PYYHINTÄ": ["BACKSTAGE WC PYYHINTÄ"],
      "PETAUS DOUBLE": ["PEATUS DOUBLE"],
      PETAUS: ["PEATUS"],
      PYYHINTÄ: ["PYYHTINÄ"],
      "REP+SETIT": ["REP + SETIT"],
      "PYYHINTÄ+JAKO": ["PYYHINTÄ + JAKO"],
      "ROSKAT+IMURI": ["ROSKAT + IMURI"],
      "WC:T TORGET+PYYHINTÄ": ["WC:T TORGET PYYHINTÄ"],
      "KONFFA WC:t": ["KONFFA WC"],
      "MARKET WC:t": ["MARKET WC"],
    }

    // Check exact alternatives only
    if (normalizedTask in exactAlternatives) {
      for (const alternative of exactAlternatives[normalizedTask]) {
        if (normalizedPref === alternative) {
          console.log(`✅ Exact alternative match`)
          return true
        }
      }
    }

    // Check reverse alternatives
    for (const [key, alternatives] of Object.entries(exactAlternatives)) {
      if (alternatives.includes(normalizedPref) && normalizedTask === key) {
        console.log(`✅ Reverse exact alternative match`)
        return true
      }
    }

    console.log("❌ No match - strict word-to-word matching required")
    return false
  }

  public testTaskMatch(taskName: string, preference: string): boolean {
    return this.taskMatchesPreference(taskName, preference)
  }

  public getWorkersForTask(taskType: string): string[] {
    const workersWithPreference: { worker: string; preferenceLevel: number; totalPreferences: number }[] = []

    this.preferences.forEach((prefs, worker) => {
      for (let i = 0; i < prefs.length; i++) {
        if (this.taskMatchesPreference(taskType, prefs[i])) {
          workersWithPreference.push({
            worker,
            preferenceLevel: i,
            totalPreferences: prefs.length,
          })
          break
        }
      }
    })

    return workersWithPreference
      .sort((a, b) => {
        if (a.totalPreferences !== b.totalPreferences) {
          return a.totalPreferences - b.totalPreferences
        }
        return a.preferenceLevel - b.preferenceLevel
      })
      .map((item) => item.worker)
  }

  // Add method to get workers who prefer specific areas for PESU
  public getWorkersForAreaAndTask(areaId: string, taskType: string): string[] {
    if (taskType !== "PESU") {
      // For non-PESU tasks, use existing logic
      return this.getWorkersForTask(taskType)
    }

    console.log(`🎯 Looking for PESU workers for area: ${areaId}`)

    // For PESU tasks, consider area preferences
    const workersWithPreference: {
      worker: string
      taskPreferenceLevel: number
      areaPreferenceLevel: number
      totalPreferences: number
    }[] = []

    this.preferences.forEach((taskPrefs, worker) => {
      // Check if worker wants PESU
      let taskPreferenceLevel = -1
      for (let i = 0; i < taskPrefs.length; i++) {
        if (this.taskMatchesPreference(taskType, taskPrefs[i])) {
          taskPreferenceLevel = i
          break
        }
      }

      if (taskPreferenceLevel >= 0) {
        // Worker wants PESU, now check area preference
        const areaPrefs = this.areaPreferences.get(worker) || []
        let areaPreferenceLevel = 999 // Default to low priority

        for (let i = 0; i < areaPrefs.length; i++) {
          const preferredAreaIds = this.getAreaIdsFromPreference(areaPrefs[i])
          if (preferredAreaIds.includes(areaId)) {
            areaPreferenceLevel = i
            console.log(`✅ ${worker} prefers area ${areaPrefs[i]} (includes ${areaId}) at level ${i + 1}`)
            break
          }
        }

        if (areaPreferenceLevel === 999 && areaPrefs.length === 0) {
          // No area preferences = can go anywhere
          areaPreferenceLevel = 500 // Middle priority
          console.log(`✅ ${worker} has no area preferences (can go anywhere)`)
        } else if (areaPreferenceLevel === 999) {
          console.log(`❌ ${worker} has area preferences but doesn't prefer ${areaId}`)
        }

        workersWithPreference.push({
          worker,
          taskPreferenceLevel,
          areaPreferenceLevel,
          totalPreferences: taskPrefs.length,
        })
      }
    })

    return workersWithPreference
      .sort((a, b) => {
        // First sort by task preference (lower is better)
        if (a.taskPreferenceLevel !== b.taskPreferenceLevel) {
          return a.taskPreferenceLevel - b.taskPreferenceLevel
        }
        // Then by area preference (lower is better, 500 = no preference)
        if (a.areaPreferenceLevel !== b.areaPreferenceLevel) {
          return a.areaPreferenceLevel - b.areaPreferenceLevel
        }
        // Finally by total preferences (fewer is better)
        return a.totalPreferences - b.totalPreferences
      })
      .map((item) => item.worker)
  }

  // Add method to get workers who prefer specific areas for PYYHINTÄ tasks (same logic as PESU)
  public getWorkersForAreaAndPyyhinta(areaId: string, taskType: string): string[] {
    if (!taskType.includes("PYYHINTÄ")) {
      // For non-PYYHINTÄ tasks, use existing logic
      return this.getWorkersForTask(taskType)
    }

    console.log(`🎯 Looking for PYYHINTÄ workers for area: ${areaId}`)

    // For PYYHINTÄ tasks, consider area preferences from pyyhintaPreferences
    const workersWithPreference: {
      worker: string
      taskPreferenceLevel: number
      pyyhintaPreferenceLevel: number
      totalPreferences: number
    }[] = []

    this.preferences.forEach((taskPrefs, worker) => {
      // Check if worker wants this PYYHINTÄ task type
      let taskPreferenceLevel = -1
      for (let i = 0; i < taskPrefs.length; i++) {
        if (this.taskMatchesPreference(taskType, taskPrefs[i])) {
          taskPreferenceLevel = i
          break
        }
      }

      if (taskPreferenceLevel >= 0) {
        // Worker wants this PYYHINTÄ task, now check pyyhinta area preference
        const pyyhintaPrefs = this.pyyhintaPreferences.get(worker) || []
        let pyyhintaPreferenceLevel = 999 // Default to low priority

        for (let i = 0; i < pyyhintaPrefs.length; i++) {
          const preferredAreaIds = this.getAreaIdsFromPreference(pyyhintaPrefs[i])
          if (preferredAreaIds.includes(areaId)) {
            pyyhintaPreferenceLevel = i
            console.log(`✅ ${worker} prefers PYYHINTÄ area ${pyyhintaPrefs[i]} (includes ${areaId}) at level ${i + 1}`)
            break
          }
        }

        if (pyyhintaPreferenceLevel === 999 && pyyhintaPrefs.length === 0) {
          // No pyyhinta area preferences = can go anywhere
          pyyhintaPreferenceLevel = 500 // Middle priority
          console.log(`✅ ${worker} has no PYYHINTÄ area preferences (can go anywhere)`)
        } else if (pyyhintaPreferenceLevel === 999) {
          console.log(`❌ ${worker} has PYYHINTÄ area preferences but doesn't prefer ${areaId}`)
        }

        workersWithPreference.push({
          worker,
          taskPreferenceLevel,
          pyyhintaPreferenceLevel,
          totalPreferences: taskPrefs.length,
        })
      }
    })

    return workersWithPreference
      .sort((a, b) => {
        // First sort by task preference (lower is better)
        if (a.taskPreferenceLevel !== b.taskPreferenceLevel) {
          return a.taskPreferenceLevel - b.taskPreferenceLevel
        }
        // Then by pyyhinta area preference (lower is better, 500 = no preference)
        if (a.pyyhintaPreferenceLevel !== b.pyyhintaPreferenceLevel) {
          return a.pyyhintaPreferenceLevel - b.pyyhintaPreferenceLevel
        }
        // Finally by total preferences (fewer is better)
        return a.totalPreferences - b.totalPreferences
      })
      .map((item) => item.worker)
  }

  // Debug method to show all stored names
  public debugStoredNames(): void {
    console.log("🔍 All stored preference names:")
    Array.from(this.preferences.keys()).forEach((name) => {
      console.log(`  - "${name}"`)
    })
  }
}
