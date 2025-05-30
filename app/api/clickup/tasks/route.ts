import { type NextRequest, NextResponse } from "next/server"

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2"

// Folder ID for "Tickets"
const TICKETS_FOLDER_ID = "90020068902"

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

    // First, get all lists in the "Tickets" folder
    const folderResponse = await fetch(`${CLICKUP_API_BASE}/folder/${TICKETS_FOLDER_ID}`, { headers })
    
    if (!folderResponse.ok) {
      throw new Error(`Failed to fetch folder: ${folderResponse.statusText}`)
    }

    const folderData = await folderResponse.json()
    const lists = folderData.lists || []

    // Fetch tasks from all lists in the folder
    const tasksByList: Record<string, any[]> = {}
    const listNames: Record<string, string> = {}

    for (const list of lists) {
      try {
        const response = await fetch(`${CLICKUP_API_BASE}/list/${list.id}/task?include_closed=false`, { headers })

        if (!response.ok) {
          console.error(`Failed to fetch tasks from list ${list.name}:`, response.statusText)
          tasksByList[list.id] = []
          continue
        }

        const data = await response.json()

        // Filter tasks by allowed statuses and Team custom field value = 5
        const filteredTasks = data.tasks
          .filter((task: any) => {
            // Check status
            const hasValidStatus = ALLOWED_STATUSES.includes(task.status.status.toLowerCase())
            
            // Check Team custom field value = 5 (Automations team)
            const teamField = task.custom_fields.find((field: any) => field.name.toLowerCase() === "team")
            const isAutomationsTeam = teamField?.value === "5" || teamField?.value === 5
            
            return hasValidStatus && isAutomationsTeam
          })
          .slice(0, 15)
          .map((task: any) => ({
            ...task,
            list: {
              id: list.id,
              name: list.name,
            },
          }))

        tasksByList[list.id] = filteredTasks
        listNames[list.id] = `${list.name} - Automations`
      } catch (error) {
        console.error(`Error fetching tasks from list ${list.name}:`, error)
        tasksByList[list.id] = []
        listNames[list.id] = `${list.name} - Automations`
      }
    }

    return NextResponse.json({ tasksByList, listNames })
  } catch (error) {
    console.error("Error fetching ClickUp tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
