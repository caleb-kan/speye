import { Outlet } from 'react-router-dom'

export function RsvpLayout() {
  return (
    <div className="flex-1 flex flex-col">
      <Outlet />
    </div>
  )
}
