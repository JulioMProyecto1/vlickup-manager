import { type NextRequest, NextResponse } from "next/server"

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2"

// List IDs mapping - you'll need to replace these with your actual ClickUp list IDs
const LIST_IDS = {
  Request: "your-request-list-id",
  Support: "your-support-list-id",
  Kleinscheiss: "your-kleinscheiss-list-id",
  "From other teams": "your-from-other-teams-list-id",
}

// Allowed statuses
const ALLOWED_STATUSES = ["stakeholder check", "in progress", "accepted"]

export async function GET(request: NextRequest) {
  try {
    const token = process.env.CLICKUP_API_TOKEN

    if (!token) {
      return NextResponse.json({ error: "ClickUp API token not configured" }, { status: 500 })
    }

    const headers = {
      Authorization: token,
      "Content-Type": "application/json",
    }

    // Fetch tasks from all lists
    const allTasksByList: Record<string, any[]> = {}

    for (const [listName, listId] of Object.entries(LIST_IDS)) {
      try {
        const response = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task?include_closed=false`, { headers })

        if (!response.ok) {
          console.error(`Failed to fetch tasks from ${listName}:`, response.statusText)
          allTasksByList[listName] = []
          continue
        }

        const data = await response.json()

        // Filter tasks by allowed statuses and limit to 15
        const filteredTasks = data.tasks
          .filter((task: any) => ALLOWED_STATUSES.includes(task.status.status.toLowerCase()))
          .slice(0, 15)
          .map((task: any) => ({
            ...task,
            list: {
              id: listId,
              name: listName,
            },
          }))

        allTasksByList[listName] = filteredTasks
      } catch (error) {
        console.error(`Error fetching tasks from ${listName}:`, error)
        allTasksByList[listName] = []
      }
    }

    return NextResponse.json({ tasksByList: allTasksByList })
  } catch (error) {
    console.error("Error fetching ClickUp tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
