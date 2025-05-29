export const globalClipboard = {
  content: null as string | null,
  sourceCell: null as string | null, // Store the source cell's unique identifier

  cut(content: string, sourceCell: string, clearSource: () => void) {
    this.content = content;
    this.sourceCell = sourceCell;
    clearSource();
    console.log(`✂️ Cut to global clipboard: ${content}`);
  },

  paste() {
    console.log(`📋 Global clipboard accessed: ${this.content}`);
    return this.content;
  },

  clearSourceCell() {
    if (this.sourceCell) {
      const sourceElement = document.querySelector(`[data-cell-id="${this.sourceCell}"]`);
      if (sourceElement) {
        sourceElement.textContent = "";
        console.log(`🧹 Cleared source cell: ${this.sourceCell}`);
      } else {
        console.warn(`⚠️ Source cell not found: ${this.sourceCell}`);
      }
      this.sourceCell = null; // Reset source cell reference
    }
  },
};

// Example cell rendering
<div
  className="cell"
  data-cell-id={`area-${areaId}-row-${rowIndex}-col-${colIndex}`}
>
  {cellContent}
</div>
