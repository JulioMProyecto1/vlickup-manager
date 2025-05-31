import { type NextRequest, NextResponse } from "next/server";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export async function GET(request: NextRequest) {
  try {
    const token = process.env.CLICKUP_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "ClickUp API token not configured" },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: token,
      "Content-Type": "application/json",
    };

    // Get listArray from query parameters
    const { searchParams } = new URL(request.url);
    const listArrayParam = searchParams.get("listArray");
    if (!listArrayParam) {
      return NextResponse.json(
        { error: "listArray parameter is required" },
        { status: 400 }
      );
    }

    let listArray: { listId: string; checkSubtasks: boolean }[];
    try {
      listArray = JSON.parse(listArrayParam);
    } catch {
      return NextResponse.json(
        { error: "Invalid listIds format. Expected JSON array." },
        { status: 400 }
      );
    }
    // Fetch tasks from each list
    const tasksByList: Record<string, any[]> = {};
    const listNames: Record<string, string> = {};

    for (const list of listArray) {
      try {
        // First get list info to get list name and folder name
        const listInfoResponse = await fetch(
          `${CLICKUP_API_BASE}/list/${list.listId}`,
          { headers }
        );

        let listName = "Unknown List";
        let folderName = "Unknown Folder";

        if (listInfoResponse.ok) {
          const listInfo = await listInfoResponse.json();
          listName = listInfo.name;
          folderName = listInfo.folder?.name || "No Folder";
        }

        // Build the custom fields query parameter
        // const customFieldsQuery = encodeURIComponent(
        //   JSON.stringify([
        //     {
        //       field_id: "615e4a7b-b1f2-4b91-bd3b-323c7951f9b1",
        //       operator: "=",
        //       value: "5",
        //     },
        //   ])
        // );

        const STATUSES = [
          "under review",
          "in progress",
          "accepted",
          "stakeholder check",
        ];
        const statusQuery = STATUSES.map(
          (s) => `&statuses=${encodeURIComponent(s)}`
        ).join("");

        const JULIO_CLICKUP_ID = "18901014";
        const GILBERTO_CLICKUP_ID = "88759921";
        const MARTINS_CLICKUP_ID = "94543618";

        const ASSIGNEES = [
          JULIO_CLICKUP_ID,
          GILBERTO_CLICKUP_ID,
          MARTINS_CLICKUP_ID,
        ];
        const assigneeQuery = ASSIGNEES.map(
          (s) => `&assignees=${encodeURIComponent(s)}`
        ).join("");

        const subtasksQuery = `${list.checkSubtasks ? "&subtasks=true" : ""}`;

        // Fetch tasks with custom field filter
        const tasksUrl = `${CLICKUP_API_BASE}/list/${list.listId}/task?include_closed=false${subtasksQuery}${statusQuery}${assigneeQuery}`;
        console.log("taskUrl", tasksUrl);

        const tasksResponse = await fetch(tasksUrl, { headers });

        if (!tasksResponse.ok) {
          console.error(
            `Failed to fetch tasks from list ${list.listId}:`,
            tasksResponse.statusText
          );
          tasksByList[list.listId] = [];
          listNames[list.listId] = `${listName} - ${folderName}`;
          continue;
        }

        const tasksData = await tasksResponse.json();

        // Filter tasks by allowed statuses and limit to 15
        const filteredTasks = tasksData.tasks.map((task: any) => ({
          ...task,
          list: {
            id: list.listId,
            name: listName,
          },
        }));

        tasksByList[list.listId] = filteredTasks;
        listNames[list.listId] = `${listName} - ${folderName}`;
      } catch (error) {
        console.error(`Error fetching tasks from list ${list.listId}:`, error);
        tasksByList[list.listId] = [];
        listNames[list.listId] = `List ${list.listId} - Error`;
      }
    }

    return NextResponse.json({ tasksByList, listNames });
  } catch (error) {
    console.error("Error fetching ClickUp tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
