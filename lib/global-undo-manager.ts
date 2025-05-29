// Global undo manager for cross-component undo functionality
interface UndoAction {
  areaId: string
  cellKey: string
  previousValue: string
  newValue: string
  timestamp: number
}

class GlobalUndoManager {
  private static instance: GlobalUndoManager
  private undoStack: UndoAction[] = []
  private maxStackSize = 50
  private listeners: Set<(action: UndoAction) => void> = new Set()

  private constructor() {
    // Only setup keyboard listener on client side
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.setupGlobalKeyboardListener()
    }
  }

  public static getInstance(): GlobalUndoManager {
    if (!GlobalUndoManager.instance) {
      GlobalUndoManager.instance = new GlobalUndoManager()
    }
    return GlobalUndoManager.instance
  }

  private setupGlobalKeyboardListener(): void {
    // Double-check we're on the client side
    if (typeof document === "undefined") {
      return
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        this.performUndo()
      }
    }

    // Add listener to document to catch all Ctrl+Z events
    document.addEventListener("keydown", handleGlobalKeyDown, true)
  }

  public recordAction(areaId: string, cellKey: string, previousValue: string, newValue: string): void {
    const action: UndoAction = {
      areaId,
      cellKey,
      previousValue,
      newValue,
      timestamp: Date.now(),
    }

    this.undoStack.push(action)

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }

    console.log(`🔄 Global undo: Recorded action for ${areaId}[${cellKey}]: "${previousValue}" → "${newValue}"`)
  }

  public performUndo(): boolean {
    if (this.undoStack.length === 0) {
      console.log("🔄 Global undo: No actions to undo")
      return false
    }

    const lastAction = this.undoStack.pop()!
    console.log(
      `🔄 Global undo: Undoing action for ${lastAction.areaId}[${lastAction.cellKey}]: "${lastAction.newValue}" → "${lastAction.previousValue}"`,
    )

    // Notify all listeners about the undo action
    this.listeners.forEach((listener) => listener(lastAction))

    return true
  }

  public subscribe(listener: (action: UndoAction) => void): () => void {
    this.listeners.add(listener)
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  public getStackSize(): number {
    return this.undoStack.length
  }

  public clearStack(): void {
    this.undoStack = []
    console.log("🔄 Global undo: Stack cleared")
  }
}

export const globalUndoManager = GlobalUndoManager.getInstance()
export type { UndoAction }
