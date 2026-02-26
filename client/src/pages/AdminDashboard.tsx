import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import KycReviewPanel from "@/components/admin/KycReviewPanel";
import UserManagementPanel from "@/components/admin/UserManagementPanel";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  // 檢查是否為管理員
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">訪問被拒絕</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">只有管理員可以訪問此頁面。</p>
            <Button onClick={() => setLocation("/")} className="w-full">
              返回首頁
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">管理後台</h1>
        <p className="text-muted-foreground mt-2">歡迎回來，{user.name}</p>
      </div>

      <Tabs defaultValue="kyc" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kyc">KYC 審核</TabsTrigger>
          <TabsTrigger value="users">用戶管理</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="space-y-4">
          <KycReviewPanel />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
