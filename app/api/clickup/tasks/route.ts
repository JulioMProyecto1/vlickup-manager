import { type NextRequest, NextResponse } from "next/server"

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2"

// Space ID
const SPACE_ID = "90020068902"

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

    // Get all tasks from the space using POST query
    const tasksResponse = await fetch(`${CLICKUP_API_BASE}/space/${SPACE_ID}/task`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        archived: false,
        page: 0,
        order_by: "created",
        reverse: false,
        subtasks: true,
        include_closed: true,
        custom_fields: [
          {
            field_id: "615e4a7b-b1f2-4b91-bd3b-323c7951f9b1",
            value: 5,
          },
        ],
      }),
    })

    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.statusText}`)
    }

    const tasksData = await tasksResponse.json()
    const allTasks = tasksData.tasks || []

    // Filter tasks by allowed statuses
    const filteredTasks = allTasks.filter((task: any) => ALLOWED_STATUSES.includes(task.status.status.toLowerCase()))

    // Get unique list IDs to fetch list and folder information
    const uniqueListIds = [...new Set(filteredTasks.map((task: any) => task.list.id))]

    // Fetch list information to get folder names
    const listInfoPromises = uniqueListIds.map(async (listId: string) => {
      try {
        const listResponse = await fetch(`${CLICKUP_API_BASE}/list/${listId}`, { headers })
        if (listResponse.ok) {
          const listData = await listResponse.json()
          return {
            listId,
            listName: listData.name,
            folderName: listData.folder?.name || "No Folder",
          }
        }
      } catch (error) {
        console.error(`Error fetching list info for ${listId}:`, error)
      }
      return {
        listId,
        listName: "Unknown List",
        folderName: "Unknown Folder",
      }
    })

    const listInfoResults = await Promise.all(listInfoPromises)
    const listInfoMap = listInfoResults.reduce(
      (acc, info) => {
        acc[info.listId] = info
        return acc
      },
      {} as Record<string, { listName: string; folderName: string }>,
    )

    // Group tasks by list_id and limit to 15 per list
    const tasksByList: Record<string, any[]> = {}
    const listNames: Record<string, string> = {}

    filteredTasks.forEach((task: any) => {
      const listId = task.list.id

      if (!tasksByList[listId]) {
        tasksByList[listId] = []
      }

      // Limit to 15 tasks per list
      if (tasksByList[listId].length < 15) {
        tasksByList[listId].push({
          ...task,
          list: {
            id: listId,
            name: task.list.name,
          },
        })
      }

      // Set list display name
      const listInfo = listInfoMap[listId]
      if (listInfo) {
        listNames[listId] = `${listInfo.listName} - ${listInfo.folderName}`
      } else {
        listNames[listId] = task.list.name
      }
    })

    return NextResponse.json({ tasksByList, listNames })
  } catch (error) {
    console.error("Error fetching ClickUp tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
