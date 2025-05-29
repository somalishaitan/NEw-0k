export interface WorkerPreference {
  workerName: string
  taskPreferences: string[] // Tasks in order of preference (first is most preferred)
}
