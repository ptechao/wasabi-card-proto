import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const kycStatusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; description: string }> = {
  pending: { icon: <Clock className="h-6 w-6" />, label: "待提交", color: "text-yellow-500", description: "您的 KYC 資料已保存，等待提交至審核。" },
  submitted: { icon: <Clock className="h-6 w-6" />, label: "審核中", color: "text-blue-400", description: "您的 KYC 資料已提交，正在審核中，請耐心等待。" },
  approved: { icon: <CheckCircle2 className="h-6 w-6" />, label: "已通過", color: "text-green-500", description: "恭喜！您的身份認證已通過，可以開始使用卡片功能。" },
  rejected: { icon: <XCircle className="h-6 w-6" />, label: "已拒絕", color: "text-red-500", description: "您的 KYC 申請被拒絕，請檢查資料後重新提交。" },
};

export default function KycPage() {
  const { data: kycRecord, isLoading } = trpc.kyc.getStatus.useQuery();
  const submitMutation = trpc.kyc.submit.useMutation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    nationality: "TW",
    mobileAreaCode: "+886",
    mobilePhone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    idType: "passport",
    idNumber: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.dob || !form.nationality) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    try {
      await submitMutation.mutateAsync(form);
      toast.success("KYC 申請已提交");
      utils.kyc.getStatus.invalidate();
      utils.dashboard.summary.invalidate();
    } catch (e) {
      toast.error(`提交失敗: ${(e as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // 如果已有 KYC 記錄且非拒絕狀態，顯示狀態
  const kycStatus = kycRecord?.status as string | undefined;
  if (kycRecord && kycStatus !== "rejected") {
    const statusInfo = kycStatusConfig[kycRecord.status] || kycStatusConfig.pending;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            KYC 身份認證
          </h1>
          <p className="text-muted-foreground mt-1">管理您的身份認證狀態</p>
        </div>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <div className={`${statusInfo.color} mb-4`}>{statusInfo.icon}</div>
              <Badge variant={kycRecord.status === "approved" ? "default" : "secondary"} className="text-sm mb-3">
                {statusInfo.label}
              </Badge>
              <p className="text-muted-foreground max-w-md">{statusInfo.description}</p>

              {kycRecord.status === "approved" && (
                <div className="mt-6 p-4 rounded-lg bg-secondary/50 w-full max-w-md">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">姓名</p>
                      <p className="font-medium">{kycRecord.firstName} {kycRecord.lastName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">國籍</p>
                      <p className="font-medium">{kycRecord.nationality}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">證件類型</p>
                      <p className="font-medium">{kycRecord.idType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">持卡人 ID</p>
                      <p className="font-medium">{kycRecord.wasabiHolderId || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              {kycRecord.status === "rejected" && kycRecord.rejectReason && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>拒絕原因: {kycRecord.rejectReason}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // KYC 申請表單
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          KYC 身份認證
        </h1>
        <p className="text-muted-foreground mt-1">請填寫您的個人資料以完成身份認證</p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>個人資料</CardTitle>
          <CardDescription>所有標記 * 的欄位為必填</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名字 (First Name) *</Label>
              <Input placeholder="John" value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>姓氏 (Last Name) *</Label>
              <Input placeholder="Doe" value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>出生日期 *</Label>
              <Input type="date" value={form.dob} onChange={(e) => handleChange("dob", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>國籍 *</Label>
              <Select value={form.nationality} onValueChange={(v) => handleChange("nationality", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TW">台灣</SelectItem>
                  <SelectItem value="JP">日本</SelectItem>
                  <SelectItem value="HK">香港</SelectItem>
                  <SelectItem value="SG">新加坡</SelectItem>
                  <SelectItem value="US">美國</SelectItem>
                  <SelectItem value="GB">英國</SelectItem>
                  <SelectItem value="KR">韓國</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>手機區號</Label>
              <Input placeholder="+886" value={form.mobileAreaCode} onChange={(e) => handleChange("mobileAreaCode", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>手機號碼</Label>
              <Input placeholder="912345678" value={form.mobilePhone} onChange={(e) => handleChange("mobilePhone", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>地址資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>地址</Label>
              <Input placeholder="123 Main St" value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>城市</Label>
              <Input placeholder="Taipei" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>州/省</Label>
              <Input placeholder="Taiwan" value={form.state} onChange={(e) => handleChange("state", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>郵遞區號</Label>
              <Input placeholder="100" value={form.postalCode} onChange={(e) => handleChange("postalCode", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>證件資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>證件類型</Label>
              <Select value={form.idType} onValueChange={(v) => handleChange("idType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">護照</SelectItem>
                  <SelectItem value="id_card">身份證</SelectItem>
                  <SelectItem value="driver_license">駕照</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>證件號碼</Label>
              <Input placeholder="A123456789" value={form.idNumber} onChange={(e) => handleChange("idNumber", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "提交中..." : "提交 KYC 申請"}
        </Button>
      </div>
    </div>
  );
}
