import type { ClickUpTask, ProcessedTask } from "@/types/clickup";

export function processClickUpTasksByList(
  tasksByList: Record<string, ClickUpTask[]>
): Record<string, ProcessedTask[]> {
  const processedTasksByList: Record<string, ProcessedTask[]> = {};

  for (const [listId, tasks] of Object.entries(tasksByList)) {
    processedTasksByList[listId] = tasks
      .map((task) => {
        // Find BV per hour custom field
        const bvPerHourField = task.custom_fields.find(
          (field) => field.name.toLowerCase() === "bv per hour"
        );
        const bvPerHour = bvPerHourField?.value
          ? Math.round(Number.parseFloat(bvPerHourField.value))
          : 0;

        // Find stakeholder custom field
        const stakeholderField = task.custom_fields.find(
          (field) => field.name.toLowerCase() === "stakeholder"
        );
        const stakeholder = stakeholderField?.value
          ? stakeholderField?.value[0]?.username.split(" ")[0]
          : "Unassigned";

        // Find team custom field (only for "From other teams" list)
        const teamField = task.custom_fields.find(
          (field) => field.name.toLowerCase() === "team"
        );
        const team = task.list.name.toLowerCase().includes("other teams")
          ? teamField?.value || ""
          : undefined;

        // Get assignee name
        const assignee =
          task.assignees.length > 0
            ? task.assignees[0]?.username.split(" ")[0]
            : "Unassigned";

        return {
          id: task.id,
          name: task.name,
          status: task.status.status,
          assignee,
          stakeholder,
          team,
          bvPerHour,
          url: task.url,
          timeEstimate: task.time_estimate,
          listName: task.list.name,
        };
      })
      .sort((a, b) => b.bvPerHour - a.bvPerHour); // Sort by BV per hour descending
  }

  return processedTasksByList;
}

export function formatDateForHeader(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  const day = date.getDate();
  const daySuffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  const formatter = new Intl.DateTimeFormat("en-US", options);
  return formatter.format(date).replace(`${day}`, `${day}${daySuffix}`);
}

export function formatTaskForClipboardHTML(task: ProcessedTask): string {
  const timeEstimate = task.timeEstimate
    ? `${Math.round(task.timeEstimate / 3600000)}h`
    : "No estimate";

  const STATUS_EMOJI: any = {
    "stakeholder check": "🟣",
    "in progress": "🟡",
    accepted: "🔵",
    open: "⚫",
  };

  return `${STATUS_EMOJI[task.status]} (${task.stakeholder}) ${
    task.listName
  } - <a href="${task.url}" target="_blank">${task.name}</a> (${timeEstimate})`;
}

export function formatTaskForPlainText(task: ProcessedTask): string {
  const timeEstimate = task.timeEstimate
    ? `${Math.round(task.timeEstimate / 3600000)}h`
    : "No estimate";

  const STATUS_EMOJI: any = {
    "stakeholder check": "🟣",
    "in progress": "🟡",
    accepted: "🔵",
    open: "⚫",
  };

  return `${STATUS_EMOJI[task.status]} (${task.stakeholder}) ${
    task.listName
  } - ${task.name} ${task.url} (${timeEstimate})`;
}
