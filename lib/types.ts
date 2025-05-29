export interface AreaConfig {
  id: string
  cabins: number
  beds?: number // New property for number of beds
  suites?: {
    [suiteId: string]: boolean
  }
  full?: boolean // New property for FULL checkbox
  additionalWorkers?: number // New property for additional workers input
}

export interface WorkerAssignment {
  [areaId: string]: {
    [task: string]: string
  }
}

export interface WorkerPreference {
  workerName: string
  taskPreferences: string[] // Tasks in order of preference (first is most preferred)
  areaPreferences?: string[] // Areas in order of preference for PESU tasks (optional)
}

export interface SpecialAreaOptions {
  lattiakaivot: boolean // KEITTIÖ section
  konffahImuri: boolean // CONFERNCE section
  vistaDeck: boolean // VISTA section
  terrace: boolean // EXTRAS section
  terraceWorkers: number // Number of workers for TERRACE (1 or 2)
}
