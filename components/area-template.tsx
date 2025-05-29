"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect, useRef } from "react"
import { globalClipboard } from "@/lib/global-clipboard"
import { globalUndoManager, type UndoAction } from "@/lib/global-undo-manager"

interface AreaTemplateProps {
  areaId: string
  cabins: number
  assignments: Record<string, string>
  onPrint: () => void
  onAssignmentChange?: (areaId: string, rowIndex: number, workerName: string) => void
  globalCode: string
  globalDate: string
  onCodeChange: (code: string) => void
  onDateChange: (date: string) => void
  duplicateWorkers?: Set<string> // Add this prop
}

const ROWS_PER_PAGE = 24

// Define the structure for a table row
interface TableRow {
  worker: string
  task: string
  showArea: boolean
  isNewTaskGroup?: boolean
  originalIndex?: number
}

// Helper function to split rows into pages of exactly 24 rows
function createPaginatedRows(rows: TableRow[]): TableRow[][] {
  const pages: TableRow[][] = []

  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    const pageRows = rows.slice(i, i + ROWS_PER_PAGE)

    // Pad the page to exactly 24 rows
    while (pageRows.length < ROWS_PER_PAGE) {
      pageRows.push({ worker: "", task: "", showArea: false })
    }

    pages.push(pageRows)
  }

  // If no content, create one empty page
  if (pages.length === 0) {
    const emptyPage: TableRow[] = []
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
      emptyPage.push({ worker: "", task: "", showArea: false })
    }
    pages.push(emptyPage)
  }

  return pages
}

// Helper function to check if a task should have yellow background
function isYellowTask(taskName: string): boolean {
  const normalizedTask = taskName.trim().toUpperCase()
  return normalizedTask === "ROSKAT" || normalizedTask === "IMURI" || normalizedTask === "ROSKAT+IMURI"
}

export function AreaTemplate({
  areaId,
  cabins,
  assignments,
  onPrint,
  onAssignmentChange,
  globalCode,
  globalDate,
  onCodeChange,
  onDateChange,
  duplicateWorkers,
}: AreaTemplateProps) {
  const [activeCell, setActiveCell] = useState<{
    pageIndex: number
    rowIndex: number
    column: "worker" | "worker2" | "task" | "area"
  } | null>(null)
  const [editingCell, setEditingCell] = useState<{
    pageIndex: number
    rowIndex: number
    column: "worker" | "worker2" | "task" | "area"
  } | null>(null)
  const [selectedRange, setSelectedRange] = useState<{
    start: { pageIndex: number; rowIndex: number; column: "worker" | "worker2" | "task" | "area" }
    end: { pageIndex: number; rowIndex: number; column: "worker" | "worker2" | "task" | "area" }
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [cellValues, setCellValues] = useState<{ [key: string]: string }>({})
  const [cellColors, setCellColors] = useState<{ [key: string]: string }>({})
  const [localClipboard, setLocalClipboard] = useState<string>("")
  const [showColorPicker, setShowColorPicker] = useState<{
    show: boolean
    pageIndex: number
    rowIndex: number
    column: string
    x: number
    y: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [cutCell, setCutCell] = useState<{ cellKey: string; value: string } | null>(null)

  // Primary colors for the color picker
  const primaryColors = [
    { name: "Yellow", value: "#fef3c7", border: "#f59e0b" },
    { name: "Blue", value: "#dbeafe", border: "#3b82f6" },
    { name: "White", value: "#ffffff", border: "#d1d5db" },
    { name: "Grey", value: "#f3f4f6", border: "#6b7280" },
    { name: "Green", value: "#dcfce7", border: "#22c55e" },
    { name: "Red", value: "#fee2e2", border: "#ef4444" },
    { name: "Purple", value: "#f3e8ff", border: "#a855f7" },
    { name: "Orange", value: "#fed7aa", border: "#f97316" },
  ]

  // Color Picker Component
  const ColorPicker = () => {
    if (!showColorPicker) return null

    return (
      <div
        className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3"
        style={{
          left: showColorPicker.x,
          top: showColorPicker.y,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="text-xs font-medium text-gray-700 mb-2">Cell Color</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {primaryColors.map((color) => (
            <button
              key={color.name}
              className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform relative"
              style={{
                backgroundColor: color.value,
                borderColor: color.border,
              }}
              onClick={() => {
                const cellKey = `${showColorPicker.pageIndex}-${showColorPicker.rowIndex}-${showColorPicker.column}`
                setCellColors((prev) => ({ ...prev, [cellKey]: color.value }))

                // Force immediate re-render by updating a dummy state
                setActiveCell((prev) => (prev ? { ...prev } : null))

                setShowColorPicker(null)
              }}
              title={color.name}
            >
              {color.name === "White" && <div className="absolute inset-0 border border-gray-300 rounded"></div>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
            onClick={() => {
              const cellKey = `${showColorPicker.pageIndex}-${showColorPicker.rowIndex}-${showColorPicker.column}`
              setCellColors((prev) => {
                const newColors = { ...prev }
                delete newColors[cellKey]
                return newColors
              })

              // Force immediate re-render by updating a dummy state
              setActiveCell((prev) => (prev ? { ...prev } : null))

              setShowColorPicker(null)
            }}
          >
            Clear
          </button>
          <button
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
            onClick={() => setShowColorPicker(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Helper function to get cell styling including colors
  const getCellStyle = (
    pageIndex: number,
    rowIndex: number,
    column: string,
    isActive: boolean,
    isSelected: boolean,
    isYellow = false,
    isSectionHeader = false,
    isDuplicate = false, // Add this parameter
  ) => {
    const cellKey = `${pageIndex}-${rowIndex}-${column}`
    const customColor = cellColors[cellKey]

    let backgroundColor = ""
    if (isSectionHeader) {
      backgroundColor = "#f3f4f6" // gray-100
    } else if (isDuplicate) {
      backgroundColor = "#fee2e2" // red-100 for duplicates
    } else if (customColor) {
      backgroundColor = customColor
    } else if (isActive) {
      backgroundColor = "#eff6ff" // blue-50
    } else if (isSelected) {
      backgroundColor = "#dbeafe" // blue-100
    } else if (isYellow) {
      backgroundColor = "#fef3c7" // yellow-50
    }

    return {
      backgroundColor,
      border: isActive ? "2px solid #3b82f6" : "1px solid transparent",
      borderRadius: isActive ? "4px" : "0px",
    }
  }

  // Handle right-click for color picker
  const handleCellRightClick = (
    e: React.MouseEvent,
    pageIndex: number,
    rowIndex: number,
    column: "worker" | "worker2" | "task" | "area",
    isEditable: boolean,
  ) => {
    if (!isEditable) return

    e.preventDefault()
    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()
    setShowColorPicker({
      show: true,
      pageIndex,
      rowIndex,
      column,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  // Subscribe to global clipboard changes
  useEffect(() => {
    // Initialize with current global clipboard content
    setLocalClipboard(globalClipboard.getContent())

    // Subscribe to clipboard changes from other components
    const unsubscribe = globalClipboard.subscribe((content: string) => {
      setLocalClipboard(content)
      console.log(`📋 ${areaId}: Received clipboard update:`, content)
    })

    return unsubscribe
  }, [areaId])

  // Subscribe to global undo actions
  useEffect(() => {
    const unsubscribe = globalUndoManager.subscribe((action: UndoAction) => {
      // Only handle undo actions for this area
      if (action.areaId === areaId) {
        console.log(
          `↩️ ${areaId}: Applying undo for cell ${action.cellKey}: "${action.newValue}" → "${action.previousValue}"`,
        )

        setCellValues((prev) => ({
          ...prev,
          [action.cellKey]: action.previousValue,
        }))

        // Parse the cell key to get column and row info
        const [pageIndex, rowIndex, column] = action.cellKey.split("-")
        if (column === "worker" || column === "worker2") {
          const actualRowIndex = Number.parseInt(pageIndex) * ROWS_PER_PAGE + Number.parseInt(rowIndex)
          onAssignmentChange?.(areaId, actualRowIndex, action.previousValue)
        }
      }
    })

    return unsubscribe
  }, [areaId, onAssignmentChange])

  // Initialize cell values from assignments
  useEffect(() => {
    if (!assignments) return

    const initialValues: { [key: string]: string } = {}

    if (areaId === "UNASSIGNED") {
      const unassignedWorkers = assignments["UNASSIGNED WORKERS|workers"] || ""
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
        .filter((name) => name.length > 0)

      // Initialize worker names across pages and columns for EXTRA
      // Each page can hold 44 workers (22 rows × 2 columns, excluding MATTOPESU + REP and empty row)
      const workersPerPage = (ROWS_PER_PAGE - 2) * 2 // 44 workers per page

      // Set fixed values for first two rows
      initialValues[`0-0-worker`] = "" // First row, first column - now empty
      initialValues[`0-0-worker2`] = "MATTOPESU + REP" // First row, second column
      initialValues[`0-1-worker`] = "" // Second row, first column
      initialValues[`0-1-worker2`] = "" // Second row, second column

      // Initialize unassigned workers starting from third row
      workerNames.forEach((name, index) => {
        const pageIndex = Math.floor(index / workersPerPage)
        const indexInPage = index % workersPerPage
        const rowIndex = Math.floor(indexInPage / 2) + 2 // +2 to skip MATTOPESU + REP and empty row
        const column = indexInPage % 2 === 0 ? "worker" : "worker2"

        if (rowIndex < ROWS_PER_PAGE) {
          initialValues[`${pageIndex}-${rowIndex}-${column}`] = name
        }
      })
    } else {
      // Initialize from assignments for regular areas
      const allRows = createAllRows()
      allRows.forEach((row, index) => {
        const pageIndex = Math.floor(index / ROWS_PER_PAGE)
        const rowIndex = index % ROWS_PER_PAGE

        initialValues[`${pageIndex}-${rowIndex}-worker`] = row.worker
        initialValues[`${pageIndex}-${rowIndex}-task`] = row.task
        initialValues[`${pageIndex}-${rowIndex}-area`] = row.showArea ? areaId : ""
      })
    }

    setCellValues(initialValues)
  }, [assignments, areaId])

  // Helper function to get selected cells
  const getSelectedCells = () => {
    if (!selectedRange) return []

    const cells = []
    const { start, end } = selectedRange

    // For EXTRA areas, only consider worker and worker2 columns
    const columns = areaId === "UNASSIGNED" ? ["worker", "worker2"] : ["worker", "task", "area"]

    const startColIndex = columns.indexOf(start.column)
    const endColIndex = columns.indexOf(end.column)
    const startRowIndex = Math.min(start.rowIndex, end.rowIndex)
    const endRowIndex = Math.max(start.rowIndex, end.rowIndex)
    const startColIndexNormalized = Math.min(startColIndex, endColIndex)
    const endColIndexNormalized = Math.max(startColIndex, endColIndex)

    // Only handle single page selections for now
    if (start.pageIndex === end.pageIndex) {
      for (let row = startRowIndex; row <= endRowIndex; row++) {
        for (let col = startColIndexNormalized; col <= endColIndexNormalized; col++) {
          cells.push({
            pageIndex: start.pageIndex,
            rowIndex: row,
            column: columns[col],
            cellKey: `${start.pageIndex}-${row}-${columns[col]}`,
          })
        }
      }
    }

    return cells
  }

  // Helper function to check if a cell is selected
  const isCellSelected = (pageIndex: number, rowIndex: number, column: string) => {
    if (!selectedRange) return false

    const selectedCells = getSelectedCells()
    return selectedCells.some(
      (cell) => cell.pageIndex === pageIndex && cell.rowIndex === rowIndex && cell.column === column,
    )
  }

  // Handle keyboard events (excluding Ctrl+Z which is now handled globally)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events if we have an active cell or selected range
      // This prevents the container from receiving focus
      if (!activeCell && !selectedRange) return

      // Prevent the event from bubbling up to the container
      e.stopPropagation()

      // Handle backspace for selected range
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedRange) {
          e.preventDefault()

          const selectedCells = getSelectedCells()
          const updatedValues = { ...cellValues }

          selectedCells.forEach((cell) => {
            const previousValue = cellValues[cell.cellKey] || ""
            if (previousValue) {
              // Record action in global undo manager
              globalUndoManager.recordAction(areaId, cell.cellKey, previousValue, "")
              updatedValues[cell.cellKey] = ""

              // Trigger callback for worker column changes
              if (cell.column === "worker" || cell.column === "worker2") {
                const actualRowIndex = cell.pageIndex * ROWS_PER_PAGE + cell.rowIndex
                onAssignmentChange?.(areaId, actualRowIndex, "")
              }
            }
          })

          setCellValues(updatedValues)
          setSelectedRange(null)
          return
        }
      }

      if (!activeCell) return

      const cellKey = `${activeCell.pageIndex}-${activeCell.rowIndex}-${activeCell.column}`
      const isEditing =
        editingCell?.pageIndex === activeCell.pageIndex &&
        editingCell?.rowIndex === activeCell.rowIndex &&
        editingCell?.column === activeCell.column

      // Handle different keys based on whether we're in editing mode or just cell-selected mode
      if (!isEditing) {
        // Cell is selected but not in edit mode - Excel-like behavior
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault()

          const previousValue = cellValues[cellKey] || ""
          const newValue = ""

          // Record action in global undo manager
          globalUndoManager.recordAction(areaId, cellKey, previousValue, newValue)

          setCellValues((prev) => ({ ...prev, [cellKey]: newValue }))

          // Trigger callback for worker column changes
          if (activeCell.column === "worker" || activeCell.column === "worker2") {
            const actualRowIndex = activeCell.pageIndex * ROWS_PER_PAGE + activeCell.rowIndex
            onAssignmentChange?.(areaId, actualRowIndex, newValue)
          }
        } else if (e.ctrlKey && e.key === "c") {
          e.preventDefault()
          const value = cellValues[cellKey] || ""

          // Update global clipboard
          globalClipboard.copy(value)
          console.log(`📋 ${areaId}: Copied to global clipboard:`, value)
        } else if (e.ctrlKey && e.key === "x") {
          // Cut functionality - copy to clipboard but don't clear until paste
          e.preventDefault()
          const value = cellValues[cellKey] || ""

          if (value) {
            // Update global clipboard
            globalClipboard.copy(value)
            console.log(`✂️ ${areaId}: Cut to global clipboard:`, value)

            // Mark this cell as cut (for visual feedback) but don't clear content yet
            setCutCell({ cellKey, value })
          }
        } else if (e.ctrlKey && e.key === "v") {
          e.preventDefault()

          // Get content from global clipboard
          const clipboardContent = globalClipboard.paste()

          if (clipboardContent !== "") {
            const previousValue = cellValues[cellKey] || ""

            // Record action in global undo manager
            globalUndoManager.recordAction(areaId, cellKey, previousValue, clipboardContent)

            setCellValues((prev) => ({ ...prev, [cellKey]: clipboardContent }))

            // Trigger callback for worker column changes
            if (activeCell.column === "worker" || activeCell.column === "worker2") {
              const actualRowIndex = activeCell.pageIndex * ROWS_PER_PAGE + activeCell.rowIndex
              onAssignmentChange?.(areaId, actualRowIndex, clipboardContent)
            }

            // If there was a cut cell, now clear it and record the action
            if (cutCell) {
              const cutCellPreviousValue = cutCell.value

              // Record the cut cell clearing action
              globalUndoManager.recordAction(areaId, cutCell.cellKey, cutCellPreviousValue, "")

              // Clear the cut cell content
              setCellValues((prev) => ({ ...prev, [cutCell.cellKey]: "" }))

              // If the cut cell was a worker column, trigger the callback
              const [cutPageIndex, cutRowIndex, cutColumn] = cutCell.cellKey.split("-")
              if (cutColumn === "worker" || cutColumn === "worker2") {
                const cutActualRowIndex = Number.parseInt(cutPageIndex) * ROWS_PER_PAGE + Number.parseInt(cutRowIndex)
                onAssignmentChange?.(areaId, cutActualRowIndex, "")
              }

              setCutCell(null)
            }

            console.log(`📋 ${areaId}: Pasted from global clipboard:`, clipboardContent)
          }
        } else if (e.key === "c" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // Show color picker for active cell
          e.preventDefault()

          const cellElement = document.querySelector(
            `[data-cell="${activeCell.pageIndex}-${activeCell.rowIndex}-${activeCell.column}"]`,
          )
          if (cellElement) {
            const rect = cellElement.getBoundingClientRect()
            setShowColorPicker({
              show: true,
              pageIndex: activeCell.pageIndex,
              rowIndex: activeCell.rowIndex,
              column: activeCell.column,
              x: rect.left + rect.width / 2,
              y: rect.top,
            })
          }
        } else if (e.key === "F2" || e.key === "Enter") {
          // Enter edit mode
          e.preventDefault()
          setEditingCell(activeCell)
        } else if (e.key === "Tab") {
          // Navigate between columns
          e.preventDefault()

          if (areaId === "UNASSIGNED") {
            // For EXTRA areas, navigate between worker and worker2
            const nextColumn = activeCell.column === "worker" ? "worker2" : "worker"
            setActiveCell({
              ...activeCell,
              column: nextColumn,
            })
          } else {
            // For regular areas, navigate between worker, task, area
            const columns: ("worker" | "task" | "area")[] = ["worker", "task", "area"]
            const currentColumnIndex = columns.indexOf(activeCell.column as "worker" | "task" | "area")
            const nextColumnIndex = e.shiftKey
              ? (currentColumnIndex - 1 + columns.length) % columns.length
              : (currentColumnIndex + 1) % columns.length

            setActiveCell({
              ...activeCell,
              column: columns[nextColumnIndex],
            })
          }
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          // Navigate between rows
          e.preventDefault()

          const direction = e.key === "ArrowUp" ? -1 : 1
          const newRowIndex = Math.max(0, Math.min(ROWS_PER_PAGE - 1, activeCell.rowIndex + direction))

          setActiveCell({
            ...activeCell,
            rowIndex: newRowIndex,
          })
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          // Navigate between columns
          e.preventDefault()

          if (areaId === "UNASSIGNED") {
            // For EXTRA areas, navigate between worker and worker2
            const direction = e.key === "ArrowLeft" ? -1 : 1
            const columns = ["worker", "worker2"]
            const currentIndex = columns.indexOf(activeCell.column)
            const newIndex = Math.max(0, Math.min(columns.length - 1, currentIndex + direction))
            setActiveCell({
              ...activeCell,
              column: columns[newIndex] as "worker" | "worker2",
            })
          } else {
            // For regular areas, navigate between worker, task, area
            const columns: ("worker" | "task" | "area")[] = ["worker", "task", "area"]
            const currentColumnIndex = columns.indexOf(activeCell.column as "worker" | "task" | "area")
            const direction = e.key === "ArrowLeft" ? -1 : 1
            const newColumnIndex = Math.max(0, Math.min(columns.length - 1, currentColumnIndex + direction))

            setActiveCell({
              ...activeCell,
              column: columns[newColumnIndex],
            })
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // Start typing - enter edit mode and replace content
          e.preventDefault()

          const previousValue = cellValues[cellKey] || ""

          // Record action in global undo manager
          globalUndoManager.recordAction(areaId, cellKey, previousValue, e.key)

          setCellValues((prev) => ({ ...prev, [cellKey]: e.key }))

          // Trigger callback for worker column changes
          if (activeCell.column === "worker" || activeCell.column === "worker2") {
            const actualRowIndex = activeCell.pageIndex * ROWS_PER_PAGE + activeCell.rowIndex
            onAssignmentChange?.(areaId, actualRowIndex, e.key)
          }
          setEditingCell(activeCell)
        }
        // Note: Ctrl+Z is now handled globally, so we don't handle it here
      } else {
        // In edit mode - let normal input behavior work, but handle special keys
        if (e.key === "Escape") {
          e.preventDefault()
          setEditingCell(null)
        } else if (e.key === "Enter") {
          e.preventDefault()
          setEditingCell(null)
        } else if (e.key === "Tab") {
          e.preventDefault()
          setEditingCell(null)

          // Navigate to next column
          if (areaId === "UNASSIGNED") {
            // For EXTRA areas, navigate between worker and worker2
            const nextColumn = activeCell.column === "worker" ? "worker2" : "worker"
            setActiveCell({
              ...activeCell,
              column: nextColumn,
            })
          } else {
            // For regular areas, navigate between worker, task, area
            const columns: ("worker" | "task" | "area")[] = ["worker", "task", "area"]
            const currentColumnIndex = columns.indexOf(activeCell.column as "worker" | "task" | "area")
            const nextColumnIndex = e.shiftKey
              ? (currentColumnIndex - 1 + columns.length) % columns.length
              : (currentColumnIndex + 1) % columns.length

            setActiveCell({
              ...activeCell,
              column: columns[nextColumnIndex],
            })
          }
        }
      }
    }

    // Add event listener to document to catch all keyboard events
    // Use capture phase to ensure we handle events before they reach the container
    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [activeCell, editingCell, selectedRange, cellValues, areaId, onAssignmentChange, cutCell])

  // Handle clicks outside to deactivate cells and close color picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveCell(null)
        setEditingCell(null)
        setSelectedRange(null)
        setShowColorPicker(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle mouse events for drag selection
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        // If we only selected one cell (no actual drag), clear the selection and activate the cell
        if (
          selectedRange &&
          selectedRange.start.pageIndex === selectedRange.end.pageIndex &&
          selectedRange.start.rowIndex === selectedRange.end.rowIndex &&
          selectedRange.start.column === selectedRange.end.column
        ) {
          setActiveCell(selectedRange.start)
          setSelectedRange(null)
        }
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [isDragging, selectedRange])

  const handleCellMouseDown = (
    pageIndex: number,
    rowIndex: number,
    column: "worker" | "worker2" | "task" | "area",
    isEditable: boolean,
  ) => {
    if (isEditable) {
      setIsDragging(true)
      setSelectedRange({
        start: { pageIndex, rowIndex, column },
        end: { pageIndex, rowIndex, column },
      })
      // Don't set active cell here - let handleCellClick handle it
      setEditingCell(null)
      setShowColorPicker(null)
    }
  }

  const handleCellMouseEnter = (
    pageIndex: number,
    rowIndex: number,
    column: "worker" | "worker2" | "task" | "area",
  ) => {
    if (isDragging && selectedRange) {
      setSelectedRange({
        ...selectedRange,
        end: { pageIndex, rowIndex, column },
      })
    }
  }

  const handleCellClick = (
    pageIndex: number,
    rowIndex: number,
    column: "worker" | "worker2" | "task" | "area",
    isEditable: boolean,
  ) => {
    if (isEditable && !isDragging) {
      // Single click - just select the cell (activate it)
      setActiveCell({ pageIndex, rowIndex, column })
      setEditingCell(null)
      setSelectedRange(null)
      setShowColorPicker(null)
    }
  }

  const handleCellDoubleClick = (
    pageIndex: number,
    rowIndex: number,
    column: "worker" | "worker2" | "task" | "area",
    isEditable: boolean,
  ) => {
    if (isEditable) {
      setActiveCell({ pageIndex, rowIndex, column })
      setEditingCell({ pageIndex, rowIndex, column })
      setSelectedRange(null)
      setShowColorPicker(null)
    }
  }

  const handleCellChange = (
    pageIndex: number,
    rowIndex: number,
    column: "worker" | "worker2" | "task" | "area",
    value: string,
  ) => {
    const cellKey = `${pageIndex}-${rowIndex}-${column}`
    const previousValue = cellValues[cellKey] || ""

    // Record action in global undo manager
    globalUndoManager.recordAction(areaId, cellKey, previousValue, value)

    setCellValues((prev) => ({ ...prev, [cellKey]: value }))

    // Special handling for MATTOPESU+REP in EXTRA area
    if (areaId === "UNASSIGNED" && pageIndex === 0 && rowIndex === 0 && column === "worker2") {
      // This is the MATTOPESU+REP cell - update the assignment
      if (assignments["EXTRA"]) {
        assignments["EXTRA"]["MATTOPESU+REP|0"] = value
      }
    }

    // Trigger callback for worker column changes
    if (column === "worker" || column === "worker2") {
      const actualRowIndex = pageIndex * ROWS_PER_PAGE + rowIndex
      onAssignmentChange?.(areaId, actualRowIndex, value)
    }
  }

  if (!assignments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Area {areaId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No assignments available for this area.</p>
        </CardContent>
      </Card>
    )
  }

  // Special handling for unassigned workers - now called "EXTRA" - two worker columns
  if (areaId === "UNASSIGNED") {
    const unassignedWorkers = assignments["UNASSIGNED WORKERS|workers"] || ""
    const workerEntries = unassignedWorkers.split(" | ").filter((w) => w.trim())

    // Extract just the worker names without preferences/reasons
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

    // Calculate how many pages we need for EXTRA workers
    // Each page can hold 46 workers (24 rows × 2 columns, minus 2 rows for MATTOPESU + REP and empty row)
    const workersPerPage = (ROWS_PER_PAGE - 2) * 2 // 44 workers per page (22 rows × 2 columns)
    const totalPages = Math.max(1, Math.ceil(workerNames.length / workersPerPage))

    // Create pages for EXTRA workers
    const extraPages = []
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const pageRows: TableRow[] = []
      for (let i = 0; i < ROWS_PER_PAGE; i++) {
        pageRows.push({
          worker: "",
          task: "",
          showArea: false,
        })
      }
      extraPages.push(pageRows)
    }

    return (
      <div
        ref={containerRef}
        className="flex gap-6 print:block print:space-y-6 print:minimal-spacing focus:outline-none"
        tabIndex={-1}
        style={{ outline: "none" }}
      >
        <ColorPicker />
        {extraPages.map((pageRows, pageIndex) => (
          <Card
            key={pageIndex}
            className="area-card card-responsive print:w-auto print:break-before-page focus:outline-none"
            style={{ outline: "none" }}
          >
            <CardHeader className="card-header-responsive print:standard-header">
              <div className="flex flex-row items-center justify-between w-full">
                <div className="flex-1">
                  <CardTitle className="text-responsive-lg print:text-lg">
                    EXTRA
                    {extraPages.length > 1 && ` (Page ${pageIndex + 1} of ${extraPages.length})`}
                  </CardTitle>
                  <p className="text-responsive-sm text-muted-foreground print:text-xs">{workerNames.length} Workers</p>
                </div>
                {/* No supervisor field for EXTRA areas */}
              </div>
            </CardHeader>
            <CardContent className="card-content-responsive print:p-2">
              <div className="overflow-hidden">
                <table className="assignment-table print:table-standard">
                  {/* Two worker columns for EXTRA */}
                  <colgroup>
                    <col className="col-worker" />
                    <col className="col-worker" />
                  </colgroup>
                  {/* No headers for EXTRA areas */}
                  <tbody>
                    {pageRows.map((row, index) => {
                      const worker1CellKey = `${pageIndex}-${index}-worker`
                      const worker2CellKey = `${pageIndex}-${index}-worker2`
                      let worker1Value = ""
                      let worker2Value = ""

                      // Handle fixed structure for EXTRA pages
                      if (index === 0) {
                        // First row of ANY page: Empty in first column, MATTOPESU + REP only on first page
                        worker1Value = cellValues[worker1CellKey] ?? ""
                        if (pageIndex === 0) {
                          // Check if MATTOPESU+REP has an assigned worker
                          const mattopesuRepWorker = assignments["MATTOPESU+REP|0"] || ""
                          worker2Value = cellValues[worker2CellKey] ?? (mattopesuRepWorker || "MATTOPESU + REP")
                        } else {
                          worker2Value = cellValues[worker2CellKey] ?? ""
                        }
                      } else if (index === 1) {
                        // Second row of ANY page: Both editable but empty
                        worker1Value = cellValues[worker1CellKey] ?? ""
                        worker2Value = cellValues[worker2CellKey] ?? ""
                      } else {
                        // All other rows: Unassigned workers
                        const adjustedIndex = index - 2 // Always subtract 2 for the empty rows
                        const workerStartIndex = pageIndex * workersPerPage + adjustedIndex * 2
                        worker1Value = cellValues[worker1CellKey] ?? (workerNames[workerStartIndex] || "")
                        worker2Value = cellValues[worker2CellKey] ?? (workerNames[workerStartIndex + 1] || "")
                      }

                      const isWorker1Active =
                        activeCell?.pageIndex === pageIndex &&
                        activeCell?.rowIndex === index &&
                        activeCell?.column === "worker"
                      const isWorker2Active =
                        activeCell?.pageIndex === pageIndex &&
                        activeCell?.rowIndex === index &&
                        activeCell?.column === "worker2"

                      const isWorker1Selected = isCellSelected(pageIndex, index, "worker")
                      const isWorker2Selected = isCellSelected(pageIndex, index, "worker2")

                      const isWorker1Editing =
                        editingCell?.pageIndex === pageIndex &&
                        editingCell?.rowIndex === index &&
                        editingCell?.column === "worker"
                      const isWorker2Editing =
                        editingCell?.pageIndex === pageIndex &&
                        editingCell?.rowIndex === index &&
                        editingCell?.column === "worker2"

                      // All cells are now editable
                      const isWorker1Editable = true
                      const isWorker2Editable = true

                      // Special styling for MATTOPESU + REP cell (only on first page)
                      const isMattopesuCell = index === 0 && pageIndex === 0

                      const isWorker1Duplicate =
                        duplicateWorkers?.has(worker1Value.trim()) && worker1Value.trim() !== ""
                      const isWorker2Duplicate =
                        duplicateWorkers?.has(worker2Value.trim()) &&
                        worker2Value.trim() !== "" &&
                        worker2Value !== "MATTOPESU + REP"

                      return (
                        <tr key={index}>
                          {/* Worker Column 1 */}
                          <td
                            className="cursor-pointer relative focus:outline-none"
                            data-cell={`${pageIndex}-${index}-worker`}
                            style={getCellStyle(
                              pageIndex,
                              index,
                              "worker",
                              isWorker1Active,
                              isWorker1Selected,
                              false,
                              false,
                              isWorker1Duplicate,
                            )}
                            onMouseDown={() =>
                              isWorker1Editable && handleCellMouseDown(pageIndex, index, "worker", true)
                            }
                            onMouseEnter={() => isWorker1Editable && handleCellMouseEnter(pageIndex, index, "worker")}
                            onClick={() => isWorker1Editable && handleCellClick(pageIndex, index, "worker", true)}
                            onDoubleClick={() =>
                              isWorker1Editable && handleCellDoubleClick(pageIndex, index, "worker", true)
                            }
                            onContextMenu={(e) =>
                              isWorker1Editable && handleCellRightClick(e, pageIndex, index, "worker", true)
                            }
                            tabIndex={-1}
                          >
                            {isWorker1Editing && isWorker1Editable ? (
                              <input
                                type="text"
                                value={worker1Value}
                                onChange={(e) => handleCellChange(pageIndex, index, "worker", e.target.value)}
                                className="w-full h-6 text-sm border-0 bg-transparent p-1 outline-none focus:outline-none"
                                autoFocus
                                ref={inputRef}
                                key={`${pageIndex}-${index}-worker-${worker1Value}`}
                              />
                            ) : (
                              <div className="w-full h-6 text-sm p-1">{worker1Value}</div>
                            )}
                          </td>

                          {/* Worker Column 2 */}
                          <td
                            className="cursor-pointer relative focus:outline-none"
                            data-cell={`${pageIndex}-${index}-worker2`}
                            style={getCellStyle(
                              pageIndex,
                              index,
                              "worker2",
                              isWorker2Active,
                              isWorker2Selected,
                              isMattopesuCell,
                              false,
                              isWorker2Duplicate,
                            )}
                            onMouseDown={() =>
                              isWorker2Editable && handleCellMouseDown(pageIndex, index, "worker2", true)
                            }
                            onMouseEnter={() => isWorker2Editable && handleCellMouseEnter(pageIndex, index, "worker2")}
                            onClick={() => isWorker2Editable && handleCellClick(pageIndex, index, "worker2", true)}
                            onDoubleClick={() =>
                              isWorker2Editable && handleCellDoubleClick(pageIndex, index, "worker2", true)
                            }
                            onContextMenu={(e) =>
                              isWorker2Editable && handleCellRightClick(e, pageIndex, index, "worker2", true)
                            }
                            tabIndex={-1}
                          >
                            {isWorker2Editing && isWorker2Editable ? (
                              <input
                                type="text"
                                value={worker2Value}
                                onChange={(e) => handleCellChange(pageIndex, index, "worker2", e.target.value)}
                                className="w-full h-6 text-sm border-0 bg-transparent p-1 outline-none focus:outline-none"
                                autoFocus
                                ref={inputRef}
                                key={`${pageIndex}-${index}-worker2-${worker2Value}`}
                              />
                            ) : (
                              <div className={`w-full h-6 text-sm p-1 ${isMattopesuCell ? "font-medium" : ""}`}>
                                {worker2Value}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Global CODE and DATE fields at the bottom */}
              <div className="flex items-center gap-6 mt-3 print:mt-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`code-${areaId}-${pageIndex}`} className="text-sm font-medium whitespace-nowrap">
                    CODE:
                  </Label>
                  <Input
                    id={`code-${areaId}-${pageIndex}`}
                    type="text"
                    value={globalCode}
                    onChange={(e) => onCodeChange(e.target.value)}
                    placeholder=""
                    className="w-32 h-8 text-sm print:border print:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`date-${areaId}-${pageIndex}`} className="text-sm font-medium whitespace-nowrap">
                    Date:
                  </Label>
                  <Input
                    id={`date-${areaId}-${pageIndex}`}
                    type="text"
                    value={globalDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    placeholder=""
                    className="w-32 h-8 text-sm print:border print:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Check if this area has sections
  const hasSpecialSections = assignments["__sections"] !== undefined
  const sections = hasSpecialSections ? (assignments["__sections"] as string[]) : []
  const isSpecialArea = areaId === "D9" || areaId === "D10"

  // Helper function to get the actual task name from the task key
  const getTaskNameFromKey = (taskKey: string) => {
    const parts = taskKey.split("|")
    if (parts.length >= 2) {
      return parts[1]
    }
    return taskKey
  }

  // Create all rows for this area
  const createAllRows = (): TableRow[] => {
    const rows: TableRow[] = []

    if (isSpecialArea) {
      // For D9/D10, process by sections with section headings
      sections.forEach((section, sectionIndex) => {
        // Add section heading row
        if (sectionIndex > 0) {
          // Add a separator row before new sections (except the first one)
          rows.push({
            worker: "",
            task: "",
            showArea: false,
            isNewTaskGroup: true,
          })
        }

        // Add section header row
        rows.push({
          worker: `=== ${section} ===`,
          task: "",
          showArea: false,
          isNewTaskGroup: false,
        })

        const sectionTasks = Object.entries(assignments)
          .filter(([taskKey]) => taskKey.startsWith(`${section}|`))
          .sort(([a], [b]) => {
            const aIndex = Number.parseInt(a.split("|")[2] || "0")
            const bIndex = Number.parseInt(b.split("|")[2] || "0")
            return aIndex - bIndex
          })

        sectionTasks.forEach(([taskKey, worker]) => {
          const taskName = getTaskNameFromKey(taskKey)
          rows.push({
            worker: worker || "",
            task: taskName,
            showArea: !!(worker || taskName), // Show area if there's content
          })
        })
      })
    } else {
      // For regular areas, process by sections with task grouping
      if (hasSpecialSections) {
        let lastTaskType = ""

        sections.forEach((sectionName) => {
          const sectionTasks = Object.entries(assignments)
            .filter(([taskKey]) => taskKey.startsWith(`${sectionName}|`))
            .sort(([a], [b]) => {
              const aIndex = Number.parseInt(a.split("|")[2] || "0")
              const bIndex = Number.parseInt(b.split("|")[2] || "0")
              return aIndex - bIndex
            })

          sectionTasks.forEach(([taskKey, worker]) => {
            const taskName = sectionName
            const isNewTaskGroup = lastTaskType !== "" && lastTaskType !== taskName

            rows.push({
              worker: worker || "",
              task: taskName,
              showArea: !!(worker || taskName), // Show area if there's content
              isNewTaskGroup: isNewTaskGroup,
            })

            lastTaskType = taskName
          })
        })
      } else {
        // Fallback for areas without sections
        Object.entries(assignments)
          .filter(([key]) => !key.startsWith("__"))
          .forEach(([taskKey, worker]) => {
            const taskName = getTaskNameFromKey(taskKey)
            rows.push({
              worker: worker || "",
              task: taskName,
              showArea: !!(worker || taskName), // Show area if there's content
            })
          })
      }
    }

    return rows
  }

  const allRows = createAllRows()
  const pages = createPaginatedRows(allRows)

  return (
    <div
      ref={containerRef}
      className="flex gap-6 print:block print:space-y-6 print:minimal-spacing focus:outline-none"
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      <ColorPicker />
      {pages.map((pageRows, pageIndex) => (
        <Card
          key={pageIndex}
          className="area-card card-responsive print:w-auto print:break-before-page focus:outline-none"
          style={{ outline: "none" }}
        >
          <CardHeader className="card-header-responsive print:standard-header">
            <div className="flex flex-row items-center justify-between w-full">
              <div className="flex-1">
                <CardTitle className="text-responsive-lg print:text-lg">
                  Area {areaId}
                  {pages.length > 1 && ` (Page ${pageIndex + 1} of ${pages.length})`}
                </CardTitle>
                {cabins > 0 && (
                  <p className="text-responsive-sm text-muted-foreground print:text-xs">{cabins} Cabins</p>
                )}
              </div>
              <div className="flex items-center gap-3 print:block">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`supervisor-${areaId}-${pageIndex}`}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    Supervisor:
                  </Label>
                  <Input
                    id={`supervisor-${areaId}-${pageIndex}`}
                    type="text"
                    placeholder=""
                    className="w-32 h-8 text-sm print:border print:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="card-content-responsive print:p-2">
            <div className="overflow-hidden">
              <table className={`assignment-table print:table-standard ${isSpecialArea ? "special-area" : ""}`}>
                <colgroup>
                  {isSpecialArea ? (
                    // Balanced widths for D9/D10 - good task space, proper area and signature columns
                    <>
                      <col className="col-worker" style={{ width: "35%" }} />
                      <col className="col-task" style={{ width: "45%" }} />
                      <col className="col-area" style={{ width: "8%" }} />
                      <col className="col-signature print:table-cell" style={{ width: "12%" }} />
                    </>
                  ) : (
                    // Standard widths for regular areas
                    <>
                      <col className="col-worker" />
                      <col className="col-task" />
                      <col className="col-area" />
                      <col className="col-signature print:table-cell" />
                    </>
                  )}
                </colgroup>
                <thead className="hidden print:table-header-group">
                  <tr>
                    <th>Worker</th>
                    <th>Task</th>
                    <th>Area</th>
                    <th>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, index) => {
                    const isSectionHeader = row.worker.startsWith("=== ") && row.worker.endsWith(" ===")

                    const workerCellKey = `${pageIndex}-${index}-worker`
                    const taskCellKey = `${pageIndex}-${index}-task`
                    const areaCellKey = `${pageIndex}-${index}-area`

                    const isWorkerActive =
                      activeCell?.pageIndex === pageIndex &&
                      activeCell?.rowIndex === index &&
                      activeCell?.column === "worker"
                    const isTaskActive =
                      activeCell?.pageIndex === pageIndex &&
                      activeCell?.rowIndex === index &&
                      activeCell?.column === "task"
                    const isAreaActive =
                      activeCell?.pageIndex === pageIndex &&
                      activeCell?.rowIndex === index &&
                      activeCell?.column === "area"

                    const isWorkerSelected = isCellSelected(pageIndex, index, "worker")
                    const isTaskSelected = isCellSelected(pageIndex, index, "task")
                    const isAreaSelected = isCellSelected(pageIndex, index, "area")

                    const isWorkerEditing =
                      editingCell?.pageIndex === pageIndex &&
                      editingCell?.rowIndex === index &&
                      editingCell?.column === "worker"
                    const isTaskEditing =
                      editingCell?.pageIndex === pageIndex &&
                      editingCell?.rowIndex === index &&
                      editingCell?.column === "task"
                    const isAreaEditing =
                      editingCell?.pageIndex === pageIndex &&
                      editingCell?.rowIndex === index &&
                      editingCell?.column === "area"

                    const workerValue = cellValues[workerCellKey] ?? row.worker
                    const taskValue = cellValues[taskCellKey] ?? row.task
                    const areaValue = cellValues[areaCellKey] ?? (row.showArea ? areaId : "")

                    const isEditable = !isSectionHeader

                    // Check if this row should have yellow background for specific tasks
                    const isYellowTaskRow = isYellowTask(taskValue)

                    const isWorkerDuplicate =
                      duplicateWorkers?.has(workerValue.trim()) &&
                      workerValue.trim() !== "" &&
                      !workerValue.startsWith("=== ")

                    return (
                      <tr
                        key={index}
                        className={
                          row.isNewTaskGroup
                            ? "border-t-4 border-t-gray-400 print:border-t-4 print:border-t-gray-400"
                            : ""
                        }
                      >
                        {/* Worker Cell */}
                        <td
                          className={`${isEditable ? "cursor-pointer" : ""} relative focus:outline-none ${
                            isSectionHeader ? "font-bold text-center" : ""
                          }`}
                          data-cell={`${pageIndex}-${index}-worker`}
                          style={getCellStyle(
                            pageIndex,
                            index,
                            "worker",
                            isWorkerActive,
                            isWorkerSelected,
                            isYellowTaskRow,
                            isSectionHeader,
                            isWorkerDuplicate,
                          )}
                          onMouseDown={() => handleCellMouseDown(pageIndex, index, "worker", isEditable)}
                          onMouseEnter={() => handleCellMouseEnter(pageIndex, index, "worker")}
                          onClick={() => handleCellClick(pageIndex, index, "worker", isEditable)}
                          onDoubleClick={() => handleCellDoubleClick(pageIndex, index, "worker", isEditable)}
                          onContextMenu={(e) => handleCellRightClick(e, pageIndex, index, "worker", isEditable)}
                          tabIndex={-1}
                        >
                          {isWorkerEditing && isEditable ? (
                            <input
                              type="text"
                              value={workerValue}
                              onChange={(e) => handleCellChange(pageIndex, index, "worker", e.target.value)}
                              className="w-full h-6 text-sm border-0 bg-transparent p-1 outline-none focus:outline-none"
                              autoFocus
                              ref={inputRef}
                              key={`${pageIndex}-${index}-worker-${workerValue}`}
                            />
                          ) : (
                            <div className="w-full h-6 text-sm p-1">{workerValue}</div>
                          )}
                        </td>

                        {/* Task Cell */}
                        <td
                          className={`${isEditable ? "cursor-pointer" : ""} relative focus:outline-none ${
                            isSectionHeader ? "font-bold text-center" : ""
                          }`}
                          data-cell={`${pageIndex}-${index}-task`}
                          style={getCellStyle(
                            pageIndex,
                            index,
                            "task",
                            isTaskActive,
                            isTaskSelected,
                            isYellowTaskRow,
                            isSectionHeader,
                          )}
                          onMouseDown={() => handleCellMouseDown(pageIndex, index, "task", isEditable)}
                          onMouseEnter={() => handleCellMouseEnter(pageIndex, index, "task")}
                          onClick={() => handleCellClick(pageIndex, index, "task", isEditable)}
                          onDoubleClick={() => handleCellDoubleClick(pageIndex, index, "task", isEditable)}
                          onContextMenu={(e) => handleCellRightClick(e, pageIndex, index, "task", isEditable)}
                          tabIndex={-1}
                        >
                          {isTaskEditing && isEditable ? (
                            <input
                              type="text"
                              value={taskValue}
                              onChange={(e) => handleCellChange(pageIndex, index, "task", e.target.value)}
                              className="w-full h-6 text-sm border-0 bg-transparent p-1 outline-none focus:outline-none"
                              autoFocus
                              ref={inputRef}
                              key={`${pageIndex}-${index}-task-${taskValue}`}
                            />
                          ) : (
                            <div className="w-full h-6 text-sm p-1">{taskValue}</div>
                          )}
                        </td>

                        {/* Area Cell */}
                        <td
                          className={`${isEditable ? "cursor-pointer" : ""} relative focus:outline-none ${
                            isSectionHeader ? "font-bold text-center" : ""
                          }`}
                          data-cell={`${pageIndex}-${index}-area`}
                          style={getCellStyle(
                            pageIndex,
                            index,
                            "area",
                            isAreaActive,
                            isAreaSelected,
                            isYellowTaskRow,
                            isSectionHeader,
                          )}
                          onMouseDown={() => handleCellMouseDown(pageIndex, index, "area", isEditable)}
                          onMouseEnter={() => handleCellMouseEnter(pageIndex, index, "area")}
                          onClick={() => handleCellClick(pageIndex, index, "area", isEditable)}
                          onDoubleClick={() => handleCellDoubleClick(pageIndex, index, "area", isEditable)}
                          onContextMenu={(e) => handleCellRightClick(e, pageIndex, index, "area", isEditable)}
                          tabIndex={-1}
                        >
                          {isAreaEditing && isEditable ? (
                            <input
                              type="text"
                              value={areaValue}
                              onChange={(e) => handleCellChange(pageIndex, index, "area", e.target.value)}
                              className="w-full h-6 text-sm border-0 bg-transparent p-1 outline-none focus:outline-none"
                              autoFocus
                              ref={inputRef}
                              key={`${pageIndex}-${index}-area-${areaValue}`}
                            />
                          ) : (
                            <div className="w-full h-6 text-sm p-1">{areaValue}</div>
                          )}
                        </td>

                        <td className="hidden print:table-cell"></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Global CODE and DATE fields at the bottom */}
            <div className="flex items-center gap-6 mt-3 print:mt-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`code-${areaId}-${pageIndex}`} className="text-sm font-medium whitespace-nowrap">
                  CODE:
                </Label>
                <Input
                  id={`code-${areaId}-${pageIndex}`}
                  type="text"
                  value={globalCode}
                  onChange={(e) => onCodeChange(e.target.value)}
                  placeholder=""
                  className="w-32 h-8 text-sm print:border print:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`date-${areaId}-${pageIndex}`} className="text-sm font-medium whitespace-nowrap">
                  Date:
                </Label>
                <Input
                  id={`date-${areaId}-${pageIndex}`}
                  type="text"
                  value={globalDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  placeholder=""
                  className="w-32 h-8 text-sm print:border print:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
