import Navbar from '../components/navbar/Navbar'
import { Outlet } from 'react-router-dom'

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      {/* Left sidebar */}
      <Navbar />

      {/* Main content area; v6 layout pattern with Outlet */}
      <main className="flex-1 ml-20 p-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
