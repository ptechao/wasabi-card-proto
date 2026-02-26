import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";

export default function UserManagementPanel() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data, isLoading } = trpc.admin.users.list.useQuery({
    page: 1,
    pageSize: 20,
  });

  const { data: kycHistory } = trpc.admin.users.getKycHistory.useQuery(
    { userId: selectedUser?.id },
    { enabled: !!selectedUser }
  );

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setShowDetailDialog(true);
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "管理員" : "普通用戶";
  };

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-800"
      : "bg-blue-100 text-blue-800";
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.records.map((user: any) => (
            <Card
              key={user.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSelectUser(user)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{user.name || "未設定名稱"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">登入方式</p>
                    <p className="font-medium">{user.loginMethod || "Manus"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">註冊日期</p>
                    <p className="font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">最後登入</p>
                    <p className="font-medium">
                      {new Date(user.lastSignedIn).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {data?.records.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                沒有找到用戶
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 用戶詳細信息對話框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>用戶詳細信息</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="font-semibold mb-3">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">名稱</p>
                    <p className="font-medium">{selectedUser.name || "未設定"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">郵箱</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">角色</p>
                    <Badge className={getRoleColor(selectedUser.role)}>
                      {getRoleLabel(selectedUser.role)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">登入方式</p>
                    <p className="font-medium">{selectedUser.loginMethod || "Manus"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">註冊日期</p>
                    <p className="font-medium">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">最後登入</p>
                    <p className="font-medium">
                      {new Date(selectedUser.lastSignedIn).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* KYC 歷史 */}
              <div>
                <h3 className="font-semibold mb-3">KYC 歷史</h3>
                {kycHistory && kycHistory.length > 0 ? (
                  <div className="space-y-2">
                    {kycHistory.map((kyc: any) => (
                      <Card key={kyc.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {kyc.firstName} {kyc.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(kyc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            className={
                              kyc.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : kyc.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {kyc.status === "approved"
                              ? "已批准"
                              : kyc.status === "rejected"
                              ? "已拒絕"
                              : "待審核"}
                          </Badge>
                        </div>
                        {kyc.rejectReason && (
                          <p className="text-xs text-red-600 mt-2">
                            拒絕原因: {kyc.rejectReason}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    此用戶尚未提交 KYC 申請
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
