class GlobalClipboard {
  private content: string = ""
  private listeners: Set<(content: string) => void> = new Set()
  private cutCell: { cellKey: string; value: string; areaId: string, action?: string } | null = null
  private cutListeners: Set<(cutCell: { cellKey: string; value: string; areaId: string, action?: string } | null) => void> = new Set()

  getContent(): string {
    return this.content
  }

  copy(content: string): void {
    this.content = content
    this.cutCell = null // Clear any cut state when copying
    this.notifyCutListeners()
    this.notifyListeners()
    console.log(`📋 Copied to global clipboard: "${content}"`)
  }

  cut(content: string, cellKey: string, areaId: string): void {
    this.content = content
    this.cutCell = { cellKey, value: content, areaId, action: 'cut' }
    this.notifyCutListeners()
    this.notifyListeners()
    console.log(`✂️ Cut to global clipboard: "${content}" from ${cellKey} in ${areaId}`)
  }

  paste(): string {
    console.log(`📋 Pasting from global clipboard: "${this.content}"`)
    const cutCell = this.cutCell
    if (cutCell) {
      // Notify all components to clear the cut cell
      this.cutCell = { ...cutCell, action: 'clear' } // Set action to 'clear' before notifying
      this.notifyCutListeners()
      this.cutCell = null // Clear cutCell after notifying
    }
    return this.content
  }

  getCutCell(): { cellKey: string; value: string; areaId: string, action?: string } | null {
    return this.cutCell
  }

  clearCutCell(): void {
    this.cutCell = null
    this.notifyCutListeners()
  }

  subscribe(listener: (content: string) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeToCut(listener: (cutCell: { cellKey: string; value: string; areaId: string, action?: string } | null) => void): () => void {
    this.cutListeners.add(listener)
    return () => {
      this.cutListeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.content))
  }

  private notifyCutListeners(): void {
    this.cutListeners.forEach(listener => listener(this.cutCell))
  }
}

export const globalClipboard = new GlobalClipboard()
