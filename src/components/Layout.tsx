import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl">
        <Navbar />
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
