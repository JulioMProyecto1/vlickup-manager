import type { ClickUpTask, ProcessedTask } from "@/types/clickup"

export function processClickUpTasks(tasks: ClickUpTask[]): ProcessedTask[] {
  return tasks
    .map((task) => {
      // Find BV per hour custom field
      const bvPerHourField = task.custom_fields.find((field) => field.name.toLowerCase() === "bv per hour")
      const bvPerHour = bvPerHourField?.value ? Number.parseFloat(bvPerHourField.value) : 0

      // Find stakeholder custom field
      const stakeholderField = task.custom_fields.find((field) => field.name.toLowerCase() === "stakeholder")
      const stakeholder = stakeholderField?.value || "Unassigned"

      // Find team custom field (for "From other teams" list)
      const teamField = task.custom_fields.find((field) => field.name.toLowerCase() === "team")
      const team = teamField?.value || ""

      // Get assignee name
      const assignee = task.assignees.length > 0 ? task.assignees[0].username : "Unassigned"

      return {
        id: task.id,
        name: task.name,
        status: task.status.status,
        assignee,
        stakeholder,
        team: task.list.name === "From other teams" ? team : undefined,
        bvPerHour,
        url: task.url,
        timeEstimate: task.time_estimate,
        listName: task.list.name,
      }
    })
    .sort((a, b) => b.bvPerHour - a.bvPerHour) // Sort by BV per hour descending
}

export function formatTaskForClipboard(task: ProcessedTask): string {
  const timeEstimate = task.timeEstimate
    ? `${Math.round(task.timeEstimate / 3600000)}h` // Convert milliseconds to hours
    : "No estimate"

  return `${task.status} (${task.stakeholder}) ${task.listName} ${task.name} ${task.url} ${timeEstimate}`
}
