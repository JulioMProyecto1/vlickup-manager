"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, RefreshCw, AlertCircle } from "lucide-react"
import type { ProcessedTask } from "@/types/clickup"
import { processClickUpTasks, formatTaskForClipboard } from "@/lib/task-processor"
import { useToast } from "@/hooks/use-toast"

export default function ClickUpTaskExporter() {
  const [tasks, setTasks] = useState<ProcessedTask[]>([])
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
      const processedTasks = processClickUpTasks(data.tasks)
      setTasks(processedTasks)
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map((task) => task.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const copyTasksToClipboard = async () => {
    const selectedTaskData = tasks.filter((task) => selectedTasks.has(task.id))
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
      "to do": "bg-gray-500",
      "in progress": "bg-blue-500",
      review: "bg-yellow-500",
      done: "bg-green-500",
      blocked: "bg-red-500",
    }
    return colors[status.toLowerCase()] || "bg-gray-500"
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
    <div className="container mx-auto p-6">
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
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTasks.size === tasks.length && tasks.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all tasks"
                    />
                  </TableHead>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Stakeholder</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>BV/Hour</TableHead>
                  <TableHead>List</TableHead>
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
                    <TableCell>{task.team && <Badge variant="outline">{task.team}</Badge>}</TableCell>
                    <TableCell className="font-mono">{task.bvPerHour.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.listName}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found. Make sure your ClickUp lists are configured correctly.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
