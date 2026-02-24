import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import KycPage from "./pages/KycPage";
import CardsPage from "./pages/CardsPage";
import RechargePage from "./pages/RechargePage";
import TransactionsPage from "./pages/TransactionsPage";
import AtmPage from "./pages/AtmPage";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/kyc" component={KycPage} />
        <Route path="/cards" component={CardsPage} />
        <Route path="/recharge" component={RechargePage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/atm" component={AtmPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
