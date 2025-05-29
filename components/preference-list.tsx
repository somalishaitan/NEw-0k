"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { WorkerPreference } from "@/lib/types"

interface PreferenceListProps {
  preferences: WorkerPreference[]
  onClearPreferences: () => void
  onPreferencesUpdated: () => void
}

export function PreferenceList({ preferences, onClearPreferences, onPreferencesUpdated }: PreferenceListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Sort preferences alphabetically by worker name
  const sortedPreferences = [...preferences].sort((a, b) =>
    a.workerName.localeCompare(b.workerName, undefined, { sensitivity: "base" }),
  )

  const toggleExpand = (workerName: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(workerName)) {
      newExpanded.delete(workerName)
    } else {
      newExpanded.add(workerName)
    }
    setExpanded(newExpanded)
  }

  if (preferences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Worker Preferences (0)</CardTitle>
          <CardDescription>No preferences have been uploaded yet.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Upload a preference file to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Preferences ({preferences.length})</CardTitle>
        <CardDescription>Task and area preferences for each worker in alphabetical order</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Task Preferences</TableHead>
                <TableHead>Area Preferences (PESU)</TableHead>
                <TableHead>PYYHINTÄ Preferences</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPreferences.map((pref) => (
                <TableRow key={pref.workerName}>
                  <TableCell className="font-medium">{pref.workerName}</TableCell>
                  <TableCell>
                    {expanded.has(pref.workerName) ? (
                      <ol className="list-decimal pl-5">
                        {pref.taskPreferences.map((task, index) => (
                          <li key={index}>{task}</li>
                        ))}
                      </ol>
                    ) : (
                      <span>
                        {pref.taskPreferences.slice(0, 3).join(", ")}
                        {pref.taskPreferences.length > 3 ? "..." : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {pref.areaPreferences && pref.areaPreferences.length > 0 ? (
                      expanded.has(pref.workerName) ? (
                        <ol className="list-decimal pl-5">
                          {pref.areaPreferences.map((area, index) => (
                            <li key={index} className="text-blue-600 font-medium">
                              {area}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-blue-600 font-medium">
                          {pref.areaPreferences.slice(0, 2).join(", ")}
                          {pref.areaPreferences.length > 2 ? "..." : ""}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 text-sm">No area preference</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {pref.pyyhintaPreferences && pref.pyyhintaPreferences.length > 0 ? (
                      expanded.has(pref.workerName) ? (
                        <ol className="list-decimal pl-5">
                          {pref.pyyhintaPreferences.map((pyyhinta, index) => (
                            <li key={index} className="text-green-600 font-medium">
                              {pyyhinta}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-green-600 font-medium">
                          {pref.pyyhintaPreferences.slice(0, 2).join(", ")}
                          {pref.pyyhintaPreferences.length > 2 ? "..." : ""}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 text-sm">No PYYHINTÄ preference</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(pref.workerName)}>
                      {expanded.has(pref.workerName) ? "Collapse" : "Expand"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
