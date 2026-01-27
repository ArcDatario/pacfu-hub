import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FacultyProvider } from "@/contexts/FacultyContext";
import { MobileProvider } from "@/contexts/MobileContext"; // Add this import
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import Documents from "./pages/Documents";
import Polls from "./pages/Polls";
import Elections from "./pages/Elections";
import CreateElection from "./pages/CreateElection";
import Faculty from "./pages/Faculty";
import Messages from "./pages/Messages";
import Finance from "./pages/Finance";
import Logs from "./pages/Logs";
import SharedFile from "./pages/SharedFile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FacultyProvider>
        <MobileProvider> {/* Add this provider */}
          <TooltipProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/polls" element={<Polls />} />
                <Route path="/elections" element={<Elections />} />
                <Route path="/elections/create" element={<CreateElection />} />
                <Route path="/faculty" element={<Faculty />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/share/:token" element={<SharedFile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </MobileProvider>
      </FacultyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;