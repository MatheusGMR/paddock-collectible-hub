import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SellerDetails } from "@/hooks/useSellerData";

interface SellerContaProps {
  sellerDetails: SellerDetails | null;
  onSave: (details: Partial<SellerDetails>) => Promise<void>;
  loading: boolean;
}

export const SellerConta = ({ sellerDetails, onSave, loading }: SellerContaProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Seller details form
  const [form, setForm] = useState({
    business_name: "",
    document_number: "",
    phone: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    pix_key: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
  });

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (sellerDetails) {
      setForm({
        business_name: sellerDetails.business_name || "",
        document_number: sellerDetails.document_number || "",
        phone: sellerDetails.phone || "",
        address_street: sellerDetails.address_street || "",
        address_number: sellerDetails.address_number || "",
        address_complement: sellerDetails.address_complement || "",
        address_neighborhood: sellerDetails.address_neighborhood || "",
        address_city: sellerDetails.address_city || "",
        address_state: sellerDetails.address_state || "",
        address_zip: sellerDetails.address_zip || "",
        pix_key: sellerDetails.pix_key || "",
        bank_name: sellerDetails.bank_name || "",
        bank_agency: sellerDetails.bank_agency || "",
        bank_account: sellerDetails.bank_account || "",
      });
    }
  }, [sellerDetails]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update auth user metadata
      if (name !== (user.user_metadata?.full_name || "")) {
        await supabase.auth.updateUser({ data: { full_name: name } });
      }
      if (email !== user.email) {
        await supabase.auth.updateUser({ email });
      }
      toast({ title: "Perfil atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso" });
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "Erro ao alterar senha", variant: "destructive" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await onSave(form);
      toast({ title: "Dados salvos com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar dados", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-card rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
          <CardDescription>Dados de acesso da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={passwordSaving || !newPassword} size="sm" variant="outline" className="gap-2">
            {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Address Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Endereço</CardTitle>
          <CardDescription>Endereço da loja ou do vendedor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Comercial</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Loja do Colecionador" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ / CPF</Label>
              <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Rua</Label>
              <Input value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={form.address_complement} onChange={(e) => setForm({ ...form, address_complement: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={form.address_neighborhood} onChange={(e) => setForm({ ...form, address_neighborhood: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} placeholder="SP" />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} placeholder="00000-000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank / Pix Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Dados Bancários</CardTitle>
          <CardDescription>Utilizados para recebimento dos pagamentos via Stripe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} placeholder="email@exemplo.com ou CPF" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input value={form.bank_agency} onChange={(e) => setForm({ ...form, bank_agency: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSaveDetails} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Dados
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
