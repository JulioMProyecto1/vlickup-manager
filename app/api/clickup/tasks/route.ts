import { type NextRequest, NextResponse } from "next/server"

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2"

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

    // Get listIds from query parameters
    const { searchParams } = new URL(request.url)
    const listIdsParam = searchParams.get("listIds")

    if (!listIdsParam) {
      return NextResponse.json({ error: "listIds parameter is required" }, { status: 400 })
    }

    let listIds: string[]
    try {
      listIds = JSON.parse(listIdsParam)
    } catch {
      return NextResponse.json({ error: "Invalid listIds format. Expected JSON array." }, { status: 400 })
    }

    // Fetch tasks from each list
    const tasksByList: Record<string, any[]> = {}
    const listNames: Record<string, string> = {}

    for (const listId of listIds) {
      try {
        // First get list info to get list name and folder name
        const listInfoResponse = await fetch(`${CLICKUP_API_BASE}/list/${listId}`, { headers })

        let listName = "Unknown List"
        let folderName = "Unknown Folder"

        if (listInfoResponse.ok) {
          const listInfo = await listInfoResponse.json()
          listName = listInfo.name
          folderName = listInfo.folder?.name || "No Folder"
        }

        // Build the custom fields query parameter
        const customFieldsQuery = encodeURIComponent(
          JSON.stringify([
            {
              field_id: "615e4a7b-b1f2-4b91-bd3b-323c7951f9b1",
              operator: "=",
              value: "5",
            },
          ]),
        )

        // Fetch tasks with custom field filter
        const tasksUrl = `${CLICKUP_API_BASE}/list/${listId}/task?custom_fields=${customFieldsQuery}&include_closed=false`
        const tasksResponse = await fetch(tasksUrl, { headers })

        if (!tasksResponse.ok) {
          console.error(`Failed to fetch tasks from list ${listId}:`, tasksResponse.statusText)
          tasksByList[listId] = []
          listNames[listId] = `${listName} - ${folderName}`
          continue
        }

        const tasksData = await tasksResponse.json()

        // Filter tasks by allowed statuses and limit to 15
        const filteredTasks = tasksData.tasks
          .filter((task: any) => ALLOWED_STATUSES.includes(task.status.status.toLowerCase()))
          .slice(0, 15)
          .map((task: any) => ({
            ...task,
            list: {
              id: listId,
              name: listName,
            },
          }))

        tasksByList[listId] = filteredTasks
        listNames[listId] = `${listName} - ${folderName}`
      } catch (error) {
        console.error(`Error fetching tasks from list ${listId}:`, error)
        tasksByList[listId] = []
        listNames[listId] = `List ${listId} - Error`
      }
    }

    return NextResponse.json({ tasksByList, listNames })
  } catch (error) {
    console.error("Error fetching ClickUp tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
