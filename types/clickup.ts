export interface ClickUpTask {
  id: string
  name: string
  status: {
    status: string
    color: string
  }
  assignees: Array<{
    id: string
    username: string
    email: string
  }>
  custom_fields: Array<{
    id: string
    name: string
    value: any
  }>
  url: string
  time_estimate?: number
  list: {
    id: string
    name: string
  }
}

export interface ProcessedTask {
  id: string
  name: string
  status: string
  assignee: string
  stakeholder: string
  team?: string
  bvPerHour: number
  url: string
  timeEstimate?: number
  listName: string
}

export interface ClickUpList {
  id: string
  name: string
}
