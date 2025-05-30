"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, RefreshCw, AlertCircle } from "lucide-react"
import type { ProcessedTask } from "@/types/clickup"
import { processClickUpTasksByList, formatTaskForClipboard } from "@/lib/task-processor"
import { useToast } from "@/hooks/use-toast"

export default function ClickUpTaskExporter() {
  const [tasksByList, setTasksByList] = useState<Record<string, ProcessedTask[]>>({})
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/clickup/tasks")

      if (!response.ok) {
        throw new Error("Failed to fetch tasks")
      }

      const data = await response.json()
      const processedTasksByList = processClickUpTasksByList(data.tasksByList)
      setTasksByList(processedTasksByList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks)
    if (checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleSelectAllForList = (listName: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks)
    const listTasks = tasksByList[listName] || []

    if (checked) {
      listTasks.forEach((task) => newSelected.add(task.id))
    } else {
      listTasks.forEach((task) => newSelected.delete(task.id))
    }
    setSelectedTasks(newSelected)
  }

  const copyTasksToClipboard = async () => {
    const allTasks = Object.values(tasksByList).flat()
    const selectedTaskData = allTasks.filter((task) => selectedTasks.has(task.id))
    const formattedTasks = selectedTaskData.map(formatTaskForClipboard).join("\n")

    try {
      await navigator.clipboard.writeText(formattedTasks)
      toast({
        title: "Tasks copied!",
        description: `${selectedTaskData.length} tasks copied to clipboard`,
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy tasks to clipboard",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "stakeholder check": "bg-purple-500",
      "in progress": "bg-yellow-600", // mustard color
      accepted: "bg-cyan-500",
    }
    return colors[status.toLowerCase()] || "bg-gray-500"
  }

  const getSelectedCountForList = (listName: string) => {
    const listTasks = tasksByList[listName] || []
    return listTasks.filter((task) => selectedTasks.has(task.id)).length
  }

  const isAllSelectedForList = (listName: string) => {
    const listTasks = tasksByList[listName] || []
    return listTasks.length > 0 && listTasks.every((task) => selectedTasks.has(task.id))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tasks...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Tasks</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchTasks}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ClickUp Task Exporter</CardTitle>
              <CardDescription>Manage and export tasks from your ClickUp lists</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchTasks}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={copyTasksToClipboard} disabled={selectedTasks.size === 0}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Tasks ({selectedTasks.size})
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Individual List Cards */}
      {Object.entries(tasksByList).map(([listName, tasks]) => (
        <Card key={listName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{listName}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {getSelectedCountForList(listName)} of {tasks.length} selected
                </span>
                <Checkbox
                  checked={isAllSelectedForList(listName)}
                  onCheckedChange={(checked) => handleSelectAllForList(listName, checked as boolean)}
                  aria-label={`Select all tasks in ${listName}`}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Stakeholder</TableHead>
                    {listName === "From other teams" && <TableHead>Team</TableHead>}
                    <TableHead>BV/Hour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          onCheckedChange={(checked) => handleTaskSelection(task.id, checked as boolean)}
                          aria-label={`Select ${task.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-blue-600"
                        >
                          {task.name}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${getStatusColor(task.status)} text-white`}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.assignee}</TableCell>
                      <TableCell>{task.stakeholder}</TableCell>
                      {listName === "From other teams" && (
                        <TableCell>{task.team && <Badge variant="outline">{task.team}</Badge>}</TableCell>
                      )}
                      <TableCell className="font-mono">{task.bvPerHour}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tasks found for {listName}. Make sure your ClickUp list is configured correctly.
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {Object.keys(tasksByList).length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No lists found. Make sure your ClickUp lists are configured correctly.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
