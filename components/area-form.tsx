"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { AreaConfig } from "@/lib/types"

interface AreaFormProps {
  area: AreaConfig
  onChange: (
    cabins: number,
    suites?: { [suiteId: string]: boolean },
    full?: boolean,
    additionalWorkers?: number,
    beds?: number,
  ) => void
}

export function AreaForm({ area, onChange }: AreaFormProps) {
  const [bedsInputValue, setBedsInputValue] = useState<string>("")
  const [fullBedsInputValue, setFullBedsInputValue] = useState<string>("")

  useEffect(() => {
    setBedsInputValue(area.beds !== undefined ? area.beds.toString() : "")
  }, [area.beds])

  useEffect(() => {
    setFullBedsInputValue(
      area.additionalWorkers !== undefined && area.additionalWorkers > 0
        ? area.additionalWorkers.toString()
        : "",
    )
  }, [area.additionalWorkers])

  const areaSuites: { [areaId: string]: string[] } = {
    "7600+7700+7800": ["SUITE 7823", "SUITE 7622"],
    "8600+8700+8800": ["SUITE 8626", "SUITE 8827"],
  }

  const fullAreas = ["8000+8300", "8100+8400", "8200+8500", "5000+5300", "5400+5200"]
  const hasSuites = areaSuites[area.id] !== undefined
  const hasFull = fullAreas.includes(area.id)

  const calculateRepWorkers = () => {
    if (!area.full || !area.additionalWorkers || area.additionalWorkers <= 0) return 0
    return Math.ceil(area.additionalWorkers / 50)
  }

  const handleBedsChange = (value: string) => {
    setBedsInputValue(value)
    if (value === "") {
      onChange(area.cabins, area.suites, area.full, area.additionalWorkers, undefined)
      return
    }
    if (/^\d+$/.test(value)) {
      const beds = parseInt(value, 10)
      if (!isNaN(beds) && beds >= 0) {
        onChange(area.cabins, area.suites, area.full, area.additionalWorkers, beds)
      }
    }
  }

  const handleFullBedsChange = (value: string) => {
    setFullBedsInputValue(value)
    if (value === "") {
      onChange(area.cabins, area.suites, area.full, undefined, area.beds)
      return
    }
    if (/^\d+$/.test(value)) {
      const additionalWorkers = parseInt(value, 10)
      if (!isNaN(additionalWorkers) && additionalWorkers >= 0) {
        onChange(area.cabins, area.suites, area.full, additionalWorkers, area.beds)
      }
    }
  }

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    ]
    const isCtrlCombo = e.ctrlKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase())
    if (allowedKeys.includes(e.key) || isCtrlCombo) return
    if (!/^\d$/.test(e.key)) e.preventDefault()
  }

  return (
    <Card className="card-responsive">
      <CardHeader className="card-header-responsive">
        <CardTitle className="text-responsive-base">Area {area.id}</CardTitle>
      </CardHeader>
      <CardContent className="card-content-responsive">
        <div className="grid w-full items-center gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`cabins-${area.id}`}>Number of Cabins</Label>
              <Input
                id={`cabins-${area.id}`}
                type="number"
                min="0"
                value={area.cabins || ""}
                onChange={(e) => {
                  const cabins = parseInt(e.target.value) || 0
                  onChange(cabins, area.suites, area.full, area.additionalWorkers, area.beds)
                }}
                className="input-responsive"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor={`beds-${area.id}`}>Number of Beds</Label>
              <Input
                id={`beds-${area.id}`}
                type="text"
                inputMode="numeric"
                value={bedsInputValue}
                placeholder="Optional"
                onChange={(e) => handleBedsChange(e.target.value)}
                onKeyDown={handleNumericKeyDown}
                className="input-responsive"
              />
            </div>
          </div>

          {hasFull && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`full-${area.id}`}
                  checked={area.full || false}
                  onCheckedChange={(checked) => {
                    onChange(area.cabins, area.suites, checked === true, area.additionalWorkers, area.beds)
                  }}
                />
                <Label htmlFor={`full-${area.id}`} className="text-sm font-normal">
                  FULL
                </Label>
              </div>
              {area.full && (
                <div className="pl-6 space-y-2">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor={`full-input-${area.id}`} className="text-xs text-muted-foreground">
                      Amount of Beds (FULL)
                    </Label>
                    <Input
                      id={`full-input-${area.id}`}
                      type="text"
                      inputMode="numeric"
                      value={fullBedsInputValue}
                      placeholder="Enter bed count"
                      className="h-8 text-sm input-responsive"
                      onChange={(e) => handleFullBedsChange(e.target.value)}
                      onKeyDown={handleNumericKeyDown}
                    />
                  </div>
                  {area.additionalWorkers && area.additionalWorkers > 0 && calculateRepWorkers() > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Auto-calculated: {calculateRepWorkers()} REP + 1 SETIT + 1 JAKO
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {hasSuites && (
            <div className="space-y-2">
              <Label>Available Suites</Label>
              <div className="grid gap-2">
                {areaSuites[area.id].map((suiteId) => (
                  <div key={suiteId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`suite-${suiteId}`}
                      checked={area.suites?.[suiteId] || false}
                      onCheckedChange={(checked) => {
                        const newSuites = { ...(area.suites || {}) }
                        newSuites[suiteId] = checked === true
                        onChange(area.cabins, newSuites, area.full, area.additionalWorkers, area.beds)
                      }}
                    />
                    <Label htmlFor={`suite-${suiteId}`} className="text-sm font-normal">
                      {suiteId}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
