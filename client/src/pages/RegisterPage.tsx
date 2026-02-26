import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const registerMutation = trpc.auth.registerWithEmail.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("密碼不相符");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("密碼至少需要 6 個字符");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("請輸入有效的 Email 地址");
      return;
    }

    try {
      setIsLoading(true);
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || "User",
        lastName: formData.lastName || "",
      });
      toast.success("註冊成功！請登入");
      setTimeout(() => {
        window.location.href = getLoginUrl();
      }, 1500);
    } catch (error) {
      toast.error(`註冊失敗: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">建立帳戶</CardTitle>
            <CardDescription className="text-center">
              使用 Email 建立您的 WasabiCard 帳戶
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-medium">
                    名字
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-medium">
                    姓氏
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="border-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium">
                  密碼 *
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="至少 6 個字符"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-medium">
                  確認密碼 *
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="再次輸入密碼"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="border-2"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6 font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "建立中..." : "建立帳戶"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              已有帳戶？{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-primary font-semibold"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                使用 Manus 登入
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
