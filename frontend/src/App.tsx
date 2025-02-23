import "./index.css";
import { useState } from "react";
import { APITester } from "./APITester";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { DraggableTabs } from "@/components/DraggableTabs";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

interface Tab {
  id: string;
  value: string;
  label: string;
  content: React.ReactNode;
}

export function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: "home",
      value: "home",
      label: "Home",
      content: (
        <TabsContent value="home">
          <Card className="bg-card/50 backdrop-blur-sm border-muted">
            <CardContent className="pt-6">
              <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
              <p>
                Edit{" "}
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                  src/App.tsx
                </code>{" "}
                and save to test HMR
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      ),
    },
    {
      id: "api",
      value: "api",
      label: "API Tester",
      content: (
        <TabsContent value="api">
          <Card className="bg-card/50 backdrop-blur-sm border-muted">
            <CardContent className="pt-6">
              <h2 className="text-3xl font-bold mb-4">API Testing</h2>
              <APITester />
            </CardContent>
          </Card>
        </TabsContent>
      ),
    },
  ]);

  const handleTabsReorder = (newTabs: Tab[]) => {
    setTabs(newTabs);
  };

  const handleTabClose = (tabId: string) => {
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    if (newTabs.length > 0 && tabId === activeTab) {
      setActiveTab(newTabs[0].id);
    }
    setTabs(newTabs);
  };

  return (
    <div className="container mx-auto p-8 text-center relative z-10">
      <DraggableTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTabsReorder={handleTabsReorder}
        onTabClose={handleTabClose}
      />
    </div>
  );
}

export default App;
