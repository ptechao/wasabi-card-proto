import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "待審核",
  submitted: "已提交",
  approved: "已批准",
  rejected: "已拒絕",
};

export default function KycReviewPanel() {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.kyc.list.useQuery({
    status: selectedStatus,
    page: 1,
    pageSize: 20,
  });

  const approveMutation = trpc.admin.kyc.approve.useMutation({
    onSuccess: () => {
      toast.success("KYC 已批准");
      refetch();
      setSelectedKyc(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.admin.kyc.reject.useMutation({
    onSuccess: () => {
      toast.success("KYC 已拒絕");
      refetch();
      setSelectedKyc(null);
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("請輸入拒絕原因");
      return;
    }
    rejectMutation.mutate({ id: selectedKyc.id, reason: rejectReason });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "submitted", "approved", "rejected"].map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? "default" : "outline"}
            onClick={() => setSelectedStatus(selectedStatus === status ? undefined : status)}
          >
            {statusLabels[status]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.records.map((kyc: any) => (
            <Card key={kyc.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedKyc(kyc)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {kyc.firstName} {kyc.lastName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{kyc.email}</p>
                  </div>
                  <Badge className={statusColors[kyc.status]}>
                    {statusLabels[kyc.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">出生日期</p>
                    <p className="font-medium">{kyc.dob}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">國籍</p>
                    <p className="font-medium">{kyc.nationality}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">提交時間</p>
                    <p className="font-medium">{new Date(kyc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">證件類型</p>
                    <p className="font-medium">{kyc.idType || "未提供"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {data?.records.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                沒有找到相關的 KYC 記錄
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* KYC 詳細信息對話框 */}
      <Dialog open={!!selectedKyc} onOpenChange={(open) => !open && setSelectedKyc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC 詳細信息</DialogTitle>
          </DialogHeader>

          {selectedKyc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">名字</p>
                  <p className="font-medium">{selectedKyc.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">姓氏</p>
                  <p className="font-medium">{selectedKyc.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">出生日期</p>
                  <p className="font-medium">{selectedKyc.dob}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">國籍</p>
                  <p className="font-medium">{selectedKyc.nationality}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">郵箱</p>
                  <p className="font-medium">{selectedKyc.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">地址</p>
                  <p className="font-medium">{selectedKyc.address || "未提供"}</p>
                </div>
              </div>

              {/* 文件預覽 */}
              <div className="space-y-2">
                <p className="font-semibold">上傳文件</p>
                {selectedKyc.idFrontUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground">身份證正面</p>
                    <img src={selectedKyc.idFrontUrl} alt="ID Front" className="w-full h-auto rounded border" />
                  </div>
                )}
                {selectedKyc.idBackUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground">身份證背面</p>
                    <img src={selectedKyc.idBackUrl} alt="ID Back" className="w-full h-auto rounded border" />
                  </div>
                )}
                {selectedKyc.selfieUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground">自拍照</p>
                    <img src={selectedKyc.selfieUrl} alt="Selfie" className="w-full h-auto rounded border" />
                  </div>
                )}
              </div>

              {selectedKyc.rejectReason && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-sm font-medium text-red-800">拒絕原因</p>
                  <p className="text-sm text-red-700">{selectedKyc.rejectReason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedKyc?.status === "submitted" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  拒絕
                </Button>
                <Button
                  onClick={() => handleApprove(selectedKyc.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  批准
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSelectedKyc(null)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒絕對話框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒絕 KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">請提供拒絕原因</p>
            <Textarea
              placeholder="輸入拒絕原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              確認拒絕
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
