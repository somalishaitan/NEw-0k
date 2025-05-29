import type { AreaConfig, WorkerAssignment, SpecialAreaOptions } from "./types"
import { PreferenceManager } from "./preference-manager"

// Base D9 and D10 sections - these will be modified based on special options
const BASE_D9_SECTIONS = [
  {
    heading: "TORGET",
    tasks: ["KIDS+HANGOUT+ PORTAAT IMURI", "TORGET IMURI", "WC:T TORGET+PYYHINTÄ", "KIDS+HANGOUT+TORGET PYYHINTÄ"],
  },
  {
    heading: "CONFERNCE",
    tasks: ["KONFFA WC:t"],
  },
  {
    heading: "PORTAIKOT",
    tasks: [
      "HISSIT+KEULAPORTAAT IMURI 5-11",
      "KEULAPORTAAT PYYHINTÄ + AULAT",
      "HISSIT+KESKIPORTAAT IMURI 5-11",
      "KESKIPORTAAT PYYHINTÄ + AULAT",
      "HISSIT+PERÄPORTAAT IMURI 6-11",
      "PERÄPORTAAT PYYHINTÄ + AULAT",
    ],
  },
]

const BASE_D10_SECTIONS = [
  {
    heading: "MARKET",
    tasks: ["MARKET IMURI", "MARKET KONE", "MARKET PYYHINTÄ", "MARKET WC:t"],
  },
  {
    heading: "KEITTIÖ",
    tasks: ["KEITTIÖ", "WC:T 10+11"],
  },
  {
    heading: "VISTA",
    tasks: ["IMURI LOUNGE ->", "IMURI CASINO ->", "BACKSTAGE WC:T+ PYYHINTÄ", "VISTA WC:t 10+11"],
  },
  {
    heading: "EXTRAS",
    tasks: ["SLIDING DOOR D6/D7", "ROSKASTUS", "SMOKING ROOM + KONE", "MARKET EXTRA"],
  },
]

function getDynamicSections(specialOptions: SpecialAreaOptions) {
  const d9Sections = BASE_D9_SECTIONS.map((section) => ({
    heading: section.heading,
    tasks: [...section.tasks],
  }))

  const d10Sections = BASE_D10_SECTIONS.map((section) => ({
    heading: section.heading,
    tasks: [...section.tasks],
  }))

  console.log(
    "🔍 D10 Sections created:",
    d10Sections.map((s) => ({ heading: s.heading, taskCount: s.tasks.length })),
  )

  if (specialOptions.konffahImuri) {
    const conferenceSection = d9Sections.find((s) => s.heading === "CONFERNCE")
    if (conferenceSection) {
      conferenceSection.tasks.push("KONFFA IMURI")
    }
  }

  if (specialOptions.lattiakaivot) {
    const keittiöSection = d10Sections.find((s) => s.heading === "KEITTIÖ")
    if (keittiöSection) {
      keittiöSection.tasks.push("LATTIAKAIVOT")
    }
  }

  if (specialOptions.vistaDeck) {
    const vistaSection = d10Sections.find((s) => s.heading === "VISTA")
    if (vistaSection) {
      vistaSection.tasks.push("VISTA DECK")
    }
  }

  if (specialOptions.terrace) {
    const extrasSection = d10Sections.find((s) => s.heading === "EXTRAS")
    if (extrasSection) {
      if (specialOptions.terraceWorkers === 2) {
        extrasSection.tasks.push("TERRACE", "TERRACE")
      } else {
        extrasSection.tasks.push("TERRACE")
      }
    }
  }

  return { d9Sections, d10Sections }
}

const FULL_CAPABLE_AREAS = ["8000+8300", "8100+8400", "8200+8500", "5000+5300", "5400+5200"]

function calculatePetausWorkers(area: AreaConfig): { workers: number; label: string } {
  const isPetausDoubleArea =
    area.id.includes("8600+8700+8800") || area.id.includes("7600+7700+7800") || area.id.includes("6600+6700+6800")

  if (area.beds && area.beds > 0) {
    if (isPetausDoubleArea) {
      const workers = Math.max(1, Math.ceil(area.beds / 22.5))
      return { workers, label: "PETAUS DOUBLE" }
    } else {
      const workers = Math.max(1, Math.ceil(area.beds / 30))
      return { workers, label: "PETAUS" }
    }
  } else {
    const workers = Math.max(1, Math.ceil(area.cabins / 13))
    const label = isPetausDoubleArea ? "PETAUS DOUBLE" : "PETAUS"
    return { workers, label }
  }
}

// Enhanced task matching function that's more permissive
function doesWorkerWantTask(workerPreferences: string[], taskName: string, preferenceManager: any): boolean {
  for (const preference of workerPreferences) {
    if (preferenceManager.testTaskMatch(taskName, preference)) {
      return true
    }
  }
  return false
}

// Get base task type from numbered task (e.g., "PESU 1" -> "PESU") or area-specified task
function getBaseTaskType(taskName: string): string {
  // Handle area specifications in parentheses (e.g., "MATTOPESU + REP (Area 8000+8300)" -> "MATTOPESU + REP")
  if (taskName.includes("(") && taskName.includes(")")) {
    const baseTask = taskName.substring(0, taskName.indexOf("(")).trim()
    if (baseTask) {
      return baseTask
    }
  }

  // Handle numbered tasks
  const words = taskName.trim().split(" ")
  if (words.length > 1 && !isNaN(Number(words[words.length - 1]))) {
    // Remove the number at the end
    return words.slice(0, -1).join(" ")
  }

  return taskName
}

export function calculateAssignments(
  workers: string[],
  areaConfigs: AreaConfig[],
  specialOptions: SpecialAreaOptions,
): WorkerAssignment {
  const assignments: WorkerAssignment = {}
  const preferenceManager = PreferenceManager.getInstance()
  const assignedWorkers = new Set<string>()

  console.log("🎯 ENHANCED ASSIGNMENT SYSTEM WITH AREA PREFERENCES")
  console.log(`Total uploaded workers: ${workers.length}`)

  // Step 1: Enhanced preference detection (same as before)
  const workerPreferenceMap = new Map<string, { preferences: string[]; matchedName: string }>()

  workers.forEach((uploadedWorker) => {
    let foundPreferences: string[] = []

    // Try multiple matching strategies
    foundPreferences = preferenceManager.getPreferences(uploadedWorker)
    if (foundPreferences.length > 0) {
      workerPreferenceMap.set(uploadedWorker, { preferences: foundPreferences, matchedName: uploadedWorker })
      return
    }

    const normalizedUploaded = uploadedWorker.trim().toUpperCase().replace(/\s+/g, " ")
    foundPreferences = preferenceManager.getPreferences(normalizedUploaded)
    if (foundPreferences.length > 0) {
      workerPreferenceMap.set(uploadedWorker, { preferences: foundPreferences, matchedName: normalizedUploaded })
      return
    }

    // Try fuzzy matching
    const allPreferenceWorkers = preferenceManager.getAllPreferences()
    for (const prefWorker of allPreferenceWorkers) {
      const normalizedPref = prefWorker.workerName.trim().toUpperCase().replace(/\s+/g, " ")

      if (normalizedUploaded === normalizedPref) {
        workerPreferenceMap.set(uploadedWorker, {
          preferences: prefWorker.taskPreferences,
          matchedName: prefWorker.workerName,
        })
        break
      }

      // Name component matching
      const uploadedWords = normalizedUploaded.split(" ").filter((w) => w.length > 1)
      const prefWords = normalizedPref.split(" ").filter((w) => w.length > 1)

      if (uploadedWords.length >= 2 && prefWords.length >= 2) {
        const uploadedFirst = uploadedWords[0]
        const uploadedLast = uploadedWords[uploadedWords.length - 1]
        const prefFirst = prefWords[0]
        const prefLast = prefWords[prefWords.length - 1]

        if (
          (uploadedFirst === prefFirst && uploadedLast === prefLast) ||
          (uploadedFirst === prefLast && uploadedLast === prefFirst)
        ) {
          workerPreferenceMap.set(uploadedWorker, {
            preferences: prefWorker.taskPreferences,
            matchedName: prefWorker.workerName,
          })
          break
        }
      }
    }
  })

  const workersWithPreferences = Array.from(workerPreferenceMap.keys())
  const workersWithoutPreferences = workers.filter((w) => !workerPreferenceMap.has(w))

  console.log(`\n📊 PREFERENCE ANALYSIS:`)
  console.log(`✅ Workers with preferences: ${workersWithPreferences.length}`)
  console.log(`❌ Workers without preferences: ${workersWithoutPreferences.length}`)

  // Initialize area assignments (same as before)
  const { d9Sections, d10Sections } = getDynamicSections(specialOptions)

  assignments["D9"] = { __sections: d9Sections.map((s) => s.heading) }
  assignments["D10"] = { __sections: d10Sections.map((s) => s.heading) }

  areaConfigs.forEach((area) => {
    if (area.cabins > 0) {
      assignments[area.id] = {}
      const sections = []

      // Add single ROSKAT+IMURI section for small areas, or separate sections for larger areas
      if (area.cabins < 35) {
        sections.push("ROSKAT+IMURI")
      } else {
        sections.push("ROSKAT", "IMURI")
      }

      sections.push("PESU")

      // Only add PETAUS section for areas that actually need it
      const skipPetausAreas = ["8000+8300", "8100+8400", "8200+8500"]
      if (!skipPetausAreas.includes(area.id)) {
        const { label: petausLabel } = calculatePetausWorkers(area)
        sections.push(petausLabel)
      }

      if (area.id === "6500+6200+6100+6000") {
        sections.push("PYYHINTÄ + INVA JAKO")
      } else if (area.id === "8600+8700+8800") {
        sections.push("PYYHINTÄ+JAKO")
      } else if (area.id === "7600+7700+7800") {
        sections.push("PYYHINTÄ")
      } else {
        sections.push("PYYHINTÄ")
      }

      if (area.id === "8600+8700+8800" || area.id === "7600+7700+7800") {
        sections.push("REP+SETIT")
      }

      if (FULL_CAPABLE_AREAS.includes(area.id) && area.full && area.additionalWorkers && area.additionalWorkers > 0) {
        sections.push("REP", "SETIT", "JAKO")
      }

      if (
        (area.id === "8600+8700+8800" && (area.suites?.["SUITE 8626"] || area.suites?.["SUITE 8827"])) ||
        (area.id === "7600+7700+7800" && (area.suites?.["SUITE 7823"] || area.suites?.["SUITE 7622"]))
      ) {
        sections.push("SUITES")
      }

      assignments[area.id]["__sections"] = sections
    }
  })

  // Collect all tasks (same as before, but we'll handle PESU differently)
  interface TaskInfo {
    areaId: string
    sectionName: string
    taskName: string
    taskKey: string
    baseTaskType: string
  }

  const allTasks: TaskInfo[] = []

  // Add D9 tasks
  d9Sections.forEach((section) => {
    section.tasks.forEach((task, index) => {
      const taskKey = `${section.heading}|${task}|${index}`
      allTasks.push({
        areaId: "D9",
        sectionName: section.heading,
        taskName: task,
        taskKey,
        baseTaskType: getBaseTaskType(task),
      })
    })
  })

  // Add D10 tasks
  d10Sections.forEach((section) => {
    section.tasks.forEach((task, index) => {
      const taskKey = `${section.heading}|${task}|${index}`
      allTasks.push({
        areaId: "D10",
        sectionName: section.heading,
        taskName: task,
        taskKey,
        baseTaskType: getBaseTaskType(task),
      })
    })
  })

  // Add regular area tasks
  areaConfigs.forEach((area) => {
    const cabins = area.cabins
    if (cabins === 0) return

    // ROSKAT and IMURI logic (same as before)
    if (cabins < 35) {
      allTasks.push({
        areaId: area.id,
        sectionName: "ROSKAT+IMURI",
        taskName: "ROSKAT+IMURI",
        taskKey: `ROSKAT+IMURI|0`,
        baseTaskType: "ROSKAT+IMURI",
      })
    } else {
      const roskateWorkers = Math.ceil(cabins / 90)
      const imuriWorkers = Math.ceil(cabins / 120)

      for (let i = 0; i < roskateWorkers; i++) {
        const taskName = roskateWorkers > 1 ? `ROSKAT ${i + 1}` : "ROSKAT"
        allTasks.push({
          areaId: area.id,
          sectionName: "ROSKAT",
          taskName,
          taskKey: `ROSKAT|${i}`,
          baseTaskType: "ROSKAT",
        })
      }

      for (let i = 0; i < imuriWorkers; i++) {
        const taskName = imuriWorkers > 1 ? `IMURI ${i + 1}` : "IMURI"
        allTasks.push({
          areaId: area.id,
          sectionName: "IMURI",
          taskName,
          taskKey: `IMURI|${i}`,
          baseTaskType: "IMURI",
        })
      }
    }

    // PESU tasks - these will be handled with area preferences
    const pesuWorkers = Math.max(1, Math.ceil(cabins / 13))
    for (let i = 0; i < pesuWorkers; i++) {
      const taskName = `PESU${pesuWorkers > 1 ? ` ${i + 1}` : ""}`
      allTasks.push({
        areaId: area.id,
        sectionName: "PESU",
        taskName,
        taskKey: `PESU|${i}`,
        baseTaskType: "PESU",
      })
    }

    // Rest of the tasks (same as before)
    const skipPetausAreas = ["8000+8300", "8100+8400", "8200+8500"]
    if (!skipPetausAreas.includes(area.id)) {
      const { workers: petausWorkers, label: petausLabel } = calculatePetausWorkers(area)
      for (let i = 0; i < petausWorkers; i++) {
        const taskName = `${petausLabel}${petausWorkers > 1 ? ` ${i + 1}` : ""}`
        allTasks.push({
          areaId: area.id,
          sectionName: petausLabel,
          taskName,
          taskKey: `${petausLabel}|${i}`,
          baseTaskType: petausLabel,
        })
      }
    }

    // PYYHINTÄ logic (same as before)
    if (area.id === "6500+6200+6100+6000") {
      const pyyhintaInvaJakoWorkers = Math.max(1, Math.ceil(cabins / 50))
      for (let i = 0; i < pyyhintaInvaJakoWorkers; i++) {
        const taskName = pyyhintaInvaJakoWorkers > 1 ? `PYYHINTÄ + INVA JAKO ${i + 1}` : "PYYHINTÄ + INVA JAKO"
        allTasks.push({
          areaId: area.id,
          sectionName: "PYYHINTÄ + INVA JAKO",
          taskName,
          taskKey: `PYYHINTÄ + INVA JAKO|${i}`,
          baseTaskType: "PYYHINTÄ + INVA JAKO",
        })
      }
    } else if (area.id === "8600+8700+8800") {
      // Special case for 8600+8700+8800: use PYYHINTÄ+JAKO
      allTasks.push({
        areaId: area.id,
        sectionName: "PYYHINTÄ+JAKO",
        taskName: "PYYHINTÄ+JAKO",
        taskKey: `PYYHINTÄ+JAKO|0`,
        baseTaskType: "PYYHINTÄ+JAKO",
      })
    } else if (cabins <= 90) {
      allTasks.push({
        areaId: area.id,
        sectionName: "PYYHINTÄ",
        taskName: "PYYHINTÄ",
        taskKey: `PYYHINTÄ|0`,
        baseTaskType: "PYYHINTÄ",
      })
    } else {
      const pyyhintaWorkers = Math.ceil(cabins / 90)
      for (let i = 0; i < pyyhintaWorkers; i++) {
        const taskName = `PYYHINTÄ ${i + 1}`
        allTasks.push({
          areaId: area.id,
          sectionName: "PYYHINTÄ",
          taskName,
          taskKey: `PYYHINTÄ|${i}`,
          baseTaskType: "PYYHINTÄ",
        })
      }
    }

    // Rest of the task logic (same as before)
    if (area.id === "8600+8700+8800" || area.id === "7600+7700+7800") {
      allTasks.push({
        areaId: area.id,
        sectionName: "REP+SETIT",
        taskName: "REP+SETIT",
        taskKey: `REP+SETIT|0`,
        baseTaskType: "REP+SETIT",
      })
    }

    if (FULL_CAPABLE_AREAS.includes(area.id) && area.full && area.additionalWorkers && area.additionalWorkers > 0) {
      const repWorkers = Math.ceil(area.additionalWorkers / 50)
      for (let i = 0; i < repWorkers; i++) {
        const taskName = `REP${repWorkers > 1 ? ` ${i + 1}` : ""}`
        allTasks.push({
          areaId: area.id,
          sectionName: "REP",
          taskName,
          taskKey: `REP|${i}`,
          baseTaskType: "REP",
        })
      }

      allTasks.push({
        areaId: area.id,
        sectionName: "SETIT",
        taskName: "SETIT",
        taskKey: `SETIT|0`,
        baseTaskType: "SETIT",
      })

      allTasks.push({
        areaId: area.id,
        sectionName: "JAKO",
        taskName: "JAKO",
        taskKey: `JAKO|0`,
        baseTaskType: "JAKO",
      })
    }

    // Suite logic (same as before)
    let suiteIndex = 0
    if (area.id === "8600+8700+8800") {
      if (area.suites?.["SUITE 8626"]) {
        allTasks.push({
          areaId: area.id,
          sectionName: "SUITES",
          taskName: "SUITE 8626",
          taskKey: `SUITES|${suiteIndex++}`,
          baseTaskType: "SUITE 8626",
        })
      }
      if (area.suites?.["SUITE 8827"]) {
        allTasks.push({
          areaId: area.id,
          sectionName: "SUITES",
          taskName: "SUITE 8827",
          taskKey: `SUITES|${suiteIndex++}`,
          baseTaskType: "SUITE 8827",
        })
      }
    } else if (area.id === "7600+7700+7800") {
      if (area.suites?.["SUITE 7823"]) {
        allTasks.push({
          areaId: area.id,
          sectionName: "SUITES",
          taskName: "SUITE 7823",
          taskKey: `SUITES|${suiteIndex++}`,
          baseTaskType: "SUITE 7823",
        })
      }
      if (area.suites?.["SUITE 7622"]) {
        allTasks.push({
          areaId: area.id,
          sectionName: "SUITES",
          taskName: "SUITE 7622",
          taskKey: `SUITES|${suiteIndex++}`,
          baseTaskType: "SUITE 7622",
        })
      }
    }
  })

  console.log(`\n📊 Total tasks to assign: ${allTasks.length}`)

  // Initialize all tasks as unassigned
  allTasks.forEach((task) => {
    if (!assignments[task.areaId]) {
      assignments[task.areaId] = {}
    }
    assignments[task.areaId][task.taskKey] = ""
  })

  // ENHANCED ASSIGNMENT: Handle PESU and PYYHINTÄ tasks with area preferences first
  let assignmentCount = 0

  console.log("\n🎯 ENHANCED ASSIGNMENT: PESU and PYYHINTÄ tasks with area preferences first")

  // Separate PESU, PYYHINTÄ and other tasks
  const pesuTasks = allTasks.filter((task) => task.baseTaskType === "PESU")
  const pyyhintaTasks = allTasks.filter((task) => task.baseTaskType.includes("PYYHINTÄ"))
  const otherTasks = allTasks.filter((task) => task.baseTaskType !== "PESU" && !task.baseTaskType.includes("PYYHINTÄ"))

  // Sort PESU tasks by area preference priority
  const sortedPesuTasks = pesuTasks.sort((a, b) => {
    // You can add logic here to prioritize certain areas if needed
    return a.areaId.localeCompare(b.areaId)
  })

  // Assign PESU tasks with area preferences
  sortedPesuTasks.forEach((task) => {
    let assignedWorker = ""

    // Get workers who prefer this area for PESU
    const preferredWorkers = preferenceManager.getWorkersForAreaAndTask(task.areaId, "PESU")

    for (const worker of preferredWorkers) {
      if (assignedWorkers.has(worker)) continue // Skip if already assigned

      // Check if this worker is in our uploaded worker list
      if (workers.includes(worker)) {
        assignedWorker = worker
        assignedWorkers.add(worker)
        assignmentCount++

        console.log(`✅ PESU: "${task.taskName}" in ${task.areaId} → ${worker} (area preference match)`)
        break
      }
    }

    // If no area-preferred worker found, try general PESU workers
    if (!assignedWorker) {
      for (const worker of workersWithPreferences) {
        if (assignedWorkers.has(worker)) continue

        const workerData = workerPreferenceMap.get(worker)!
        const wantsTask = doesWorkerWantTask(workerData.preferences, "PESU", preferenceManager)

        if (wantsTask) {
          assignedWorker = worker
          assignedWorkers.add(worker)
          assignmentCount++

          console.log(`✅ PESU: "${task.taskName}" in ${task.areaId} → ${worker} (general PESU preference)`)
          break
        }
      }
    }

    // If still no worker, try workers without preferences
    if (!assignedWorker) {
      for (const worker of workersWithoutPreferences) {
        if (assignedWorkers.has(worker)) continue

        assignedWorker = worker
        assignedWorkers.add(worker)
        assignmentCount++

        console.log(`✅ PESU: "${task.taskName}" in ${task.areaId} → ${worker} (no preferences)`)
        break
      }
    }

    assignments[task.areaId][task.taskKey] = assignedWorker
  })

  // Assign PYYHINTÄ tasks with area preferences
  console.log("\n🎯 ENHANCED ASSIGNMENT: PYYHINTÄ tasks with area preferences")

  // Sort PYYHINTÄ tasks by area preference priority
  const sortedPyyhintaTasks = pyyhintaTasks.sort((a, b) => {
    return a.areaId.localeCompare(b.areaId)
  })

  // Assign PYYHINTÄ tasks with area preferences
  sortedPyyhintaTasks.forEach((task) => {
    let assignedWorker = ""

    // Get workers who prefer this area for PYYHINTÄ
    const preferredWorkers = preferenceManager.getWorkersForAreaAndPyyhinta(task.areaId, task.baseTaskType)

    for (const worker of preferredWorkers) {
      if (assignedWorkers.has(worker)) continue // Skip if already assigned

      // Check if this worker is in our uploaded worker list
      if (workers.includes(worker)) {
        assignedWorker = worker
        assignedWorkers.add(worker)
        assignmentCount++

        console.log(`✅ PYYHINTÄ: "${task.taskName}" in ${task.areaId} → ${worker} (area preference match)`)
        break
      }
    }

    // If no area-preferred worker found, try general PYYHINTÄ workers
    if (!assignedWorker) {
      for (const worker of workersWithPreferences) {
        if (assignedWorkers.has(worker)) continue

        const workerData = workerPreferenceMap.get(worker)!
        const wantsTask = doesWorkerWantTask(workerData.preferences, task.baseTaskType, preferenceManager)

        if (wantsTask) {
          assignedWorker = worker
          assignedWorkers.add(worker)
          assignmentCount++

          console.log(`✅ PYYHINTÄ: "${task.taskName}" in ${task.areaId} → ${worker} (general PYYHINTÄ preference)`)
          break
        }
      }
    }

    // If still no worker, try workers without preferences
    if (!assignedWorker) {
      for (const worker of workersWithoutPreferences) {
        if (assignedWorkers.has(worker)) continue

        assignedWorker = worker
        assignedWorkers.add(worker)
        assignmentCount++

        console.log(`✅ PYYHINTÄ: "${task.taskName}" in ${task.areaId} → ${worker} (no preferences)`)
        break
      }
    }

    assignments[task.areaId][task.taskKey] = assignedWorker
  })

  // Now assign other tasks using existing logic - only use workers with preferences
  console.log("\n🔄 ASSIGNMENT: Other tasks with workers who have preferences only")

  otherTasks.forEach((task) => {
    let assignedWorker = ""

    // Only try workers with preferences - workers without preferences go to EXTRA
    for (const worker of workersWithPreferences) {
      if (assignedWorkers.has(worker)) continue

      const workerData = workerPreferenceMap.get(worker)!
      const wantsTask =
        doesWorkerWantTask(workerData.preferences, task.taskName, preferenceManager) ||
        doesWorkerWantTask(workerData.preferences, task.baseTaskType, preferenceManager)

      if (wantsTask) {
        assignedWorker = worker
        assignedWorkers.add(worker)
        assignmentCount++

        const matchingPref = workerData.preferences.find(
          (pref) =>
            preferenceManager.testTaskMatch(task.taskName, pref) ||
            preferenceManager.testTaskMatch(task.baseTaskType, pref),
        )

        console.log(`✅ "${task.taskName}" → ${worker} (wants: "${matchingPref}")`)
        break
      }
    }

    assignments[task.areaId][task.taskKey] = assignedWorker
  })

  // Calculate final statistics and put all unassigned workers (including those without preferences) in EXTRA
  const finalUnassignedWorkers = workers.filter((w) => !assignedWorkers.has(w))
  const unassignedTasks = allTasks.filter((task) => !assignments[task.areaId][task.taskKey])

  console.log(`\n📈 ENHANCED ASSIGNMENT RESULTS:`)
  console.log(`✅ Tasks assigned: ${assignmentCount}`)
  console.log(`✅ Workers assigned: ${assignedWorkers.size}`)
  console.log(`❌ Workers unassigned: ${finalUnassignedWorkers.length}`)
  console.log(`❌ Tasks unassigned: ${unassignedTasks.length}`)

  // Create UNASSIGNED area - all workers without preferences go here immediately
  const unassignedDetails: string[] = []

  // Add workers with preferences who couldn't be assigned
  workersWithPreferences.forEach((worker) => {
    if (!assignedWorkers.has(worker)) {
      const workerData = workerPreferenceMap.get(worker)!
      unassignedDetails.push(
        `${worker} (HAS PREFERENCES: [${workerData.preferences.join(", ")}] - All tasks filled or no matching tasks)`,
      )
    }
  })

  // Add all workers without preferences directly to EXTRA
  workersWithoutPreferences.forEach((worker) => {
    unassignedDetails.push(`${worker} (NO PREFERENCES PROVIDED)`)
  })

  if (unassignedDetails.length > 0) {
    assignments["UNASSIGNED"] = {
      __sections: ["UNASSIGNED WORKERS"],
      "UNASSIGNED WORKERS|workers": unassignedDetails.join(" | "),
    }

    assignments["UNASSIGNED"]["MATTOPESU+REP|0"] = ""
  }

  return assignments
}

export function calculateWorkersNeeded(areaConfigs: AreaConfig[], specialOptions: SpecialAreaOptions): number {
  let totalNeeded = 0

  const { d9Sections, d10Sections } = getDynamicSections(specialOptions)

  const d9Tasks = d9Sections.flatMap((section) => section.tasks)
  const d10Tasks = d10Sections.flatMap((section) => section.tasks)
  totalNeeded += d9Tasks.length + d10Tasks.length

  areaConfigs.forEach((area) => {
    const cabins = area.cabins
    if (cabins === 0) return

    // ROSKAT and IMURI logic - combine if under 35 cabins, separate if 35 or more
    if (cabins < 35) {
      totalNeeded += 1 // One worker for combined ROSKAT+IMURI
    } else {
      const roskateWorkers = Math.ceil(cabins / 90)
      const imuriWorkers = Math.ceil(cabins / 120)
      totalNeeded += roskateWorkers + imuriWorkers
    }

    totalNeeded += Math.max(1, Math.ceil(cabins / 13))

    // Skip PETAUS workers for these specific areas
    const skipPetausAreas = ["8000+8300", "8100+8400", "8200+8500"]
    if (!skipPetausAreas.includes(area.id)) {
      const { workers: petausWorkers } = calculatePetausWorkers(area)
      totalNeeded += petausWorkers
    }

    // PYYHINTÄ logic - max 90 cabins per worker, special case for 6500+6200+6100+6000 (max 50 cabins)
    if (area.id === "6500+6200+6100+6000") {
      totalNeeded += Math.max(1, Math.ceil(cabins / 50))
    } else if (cabins <= 90) {
      totalNeeded += 1
    } else {
      totalNeeded += Math.ceil(cabins / 90)
    }

    if (area.id === "8600+8700+8800" || area.id === "7600+7700+7800") {
      totalNeeded += 1
    }

    if (FULL_CAPABLE_AREAS.includes(area.id) && area.full && area.additionalWorkers && area.additionalWorkers > 0) {
      totalNeeded += Math.ceil(area.additionalWorkers / 50)
      totalNeeded += 1
      totalNeeded += 1
    }

    if (area.id === "8600+8700+8800") {
      if (area.suites?.["SUITE 8626"]) totalNeeded += 1
      if (area.suites?.["SUITE 8827"]) totalNeeded += 1
    } else if (area.id === "7600+7700+7800") {
      if (area.suites?.["SUITE 7823"]) totalNeeded += 1
      if (area.suites?.["SUITE 7622"]) totalNeeded += 1
    }
  })

  return totalNeeded
}
// Removed global clipboard import as it's not used in assignment logic
