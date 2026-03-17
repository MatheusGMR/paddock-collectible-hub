import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { supabase } from "@/integrations/supabase/client";
import { PaddockLogo } from "@/components/icons/PaddockLogo";
import { useToast } from "@/hooks/use-toast";
import { AuthStepEmail } from "@/components/auth/AuthStepEmail";
import { AuthStepField } from "@/components/auth/AuthStepField";
import { AuthStepPassword } from "@/components/auth/AuthStepPassword";
import { AuthStepLogin } from "@/components/auth/AuthStepLogin";
import { AuthStepPermissions } from "@/components/auth/AuthStepPermissions";
import { AuthStepProfileType } from "@/components/auth/AuthStepProfileType";
import { AuthProgressDots } from "@/components/auth/AuthProgressDots";
import { AnimatePresence, motion } from "framer-motion";

type ProfileType = "collector" | "seller";
type AuthStep = "email" | "register-name" | "register-username" | "register-phone" | "register-profile-type" | "register-password" | "login" | "permissions";

const REGISTER_STEPS: AuthStep[] = ["email", "register-name", "register-username", "register-phone", "register-profile-type", "register-password"];

interface FormData {
  email: string;
  name: string;
  username: string;
  phone: string;
  profileType: ProfileType | null;
}

interface UserProfile {
  username: string;
  avatar_url: string | null;
}

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("email");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    name: "",
    username: "",
    phone: "",
    profileType: null,
  });
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1);

  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    storedEmail,
    authenticate: biometricAuthenticate,
    enableBiometric,
    getBiometryLabel,
  } = useBiometricAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      // Check if user is a seller and redirect accordingly
      const checkAndRedirect = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("is_seller")
          .eq("user_id", user.id)
          .single();
        if (data?.is_seller) {
          navigate("/seller", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      };
      checkAndRedirect();
    }
  }, [user, authLoading, navigate]);

  const handleEmailContinue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: formData.email },
      });

      if (data?.exists) {
        if (data.profile) {
          setExistingProfile(data.profile);
        }
        setDirection(1);
        setStep("login");
      } else {
        setDirection(1);
        setStep("register-name");
      }
    } catch {
      setDirection(1);
      setStep("register-name");
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (newStep: AuthStep, dir: number = 1) => {
    setDirection(dir);
    setStep(newStep);
  };

  const handlePasswordRegister = async (password: string) => {
    setLoading(true);
    try {
      const { error } = await signUp(
        formData.email,
        password,
        formData.username,
        formData.name,
        formData.phone
      );
      if (error) throw error;

      // After signup, if seller, mark profile as seller
      if (formData.profileType === "seller") {
        // Small delay to ensure profile is created by trigger
        setTimeout(async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase
              .from("profiles")
              .update({ is_seller: true } as any)
              .eq("user_id", currentUser.id);
          }
        }, 1000);
      }

      goToStep("permissions");
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (password: string) => {
    setLoading(true);
    try {
      const { error } = await signIn(formData.email, password);
      if (error) throw error;
      // Redirect handled by useEffect above based on is_seller
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async (): Promise<boolean> => {
    try {
      const success = await biometricAuthenticate();
      if (success) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Redirect handled by useEffect
          return true;
        } else {
          toast({
            title: "Sessão expirada",
            description: "Por favor, faça login com sua senha.",
            variant: "destructive",
          });
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const handlePermissionsComplete = () => {
    if (formData.profileType === "seller") {
      navigate("/seller", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleEnableBiometric = async (): Promise<boolean> => {
    return await enableBiometric(formData.email);
  };

  // Calculate progress for registration steps
  const currentRegisterIndex = REGISTER_STEPS.indexOf(step);
  const isRegistering = currentRegisterIndex > 0;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 animate-scale-in">
        <PaddockLogo variant="wordmark" size={80} />
      </div>

      {/* Progress dots - always rendered to avoid layout shift, invisible when not registering */}
      <div className={`mb-6 transition-opacity duration-200 ${isRegistering && step !== "permissions" ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <AuthProgressDots currentStep={Math.max(0, currentRegisterIndex - 1)} totalSteps={5} />
      </div>

      {/* Step content - fixed height container for consistent layout */}
      <div className="w-full max-w-sm h-[400px] relative overflow-hidden px-1">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", duration: 0.25 }}
            className="w-full absolute inset-0"
          >
            {step === "email" && (
              <AuthStepEmail
                email={formData.email}
                onEmailChange={(email) => setFormData((p) => ({ ...p, email }))}
                onContinue={handleEmailContinue}
                loading={loading}
              />
            )}

            {step === "register-name" && (
              <AuthStepField
                title="Como você se chama?"
                subtitle="Seu nome completo"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(name) => setFormData((p) => ({ ...p, name }))}
                onNext={() => goToStep("register-username")}
                onBack={() => goToStep("email", -1)}
              />
            )}

            {step === "register-username" && (
              <AuthStepField
                title="Escolha um nome de usuário"
                subtitle="Como você quer ser identificado na comunidade"
                placeholder="@usuario"
                value={formData.username}
                onChange={(username) => setFormData((p) => ({ ...p, username }))}
                onNext={() => goToStep("register-phone")}
                onBack={() => goToStep("register-name", -1)}
                minLength={3}
              />
            )}

            {step === "register-phone" && (
              <AuthStepField
                title="Qual é o seu telefone?"
                subtitle="Para recuperação de conta (opcional)"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(phone) => setFormData((p) => ({ ...p, phone }))}
                onNext={() => goToStep("register-profile-type")}
                onBack={() => goToStep("register-username", -1)}
                type="tel"
                required={false}
              />
            )}

            {step === "register-profile-type" && (
              <AuthStepProfileType
                selected={formData.profileType}
                onSelect={(profileType) => setFormData((p) => ({ ...p, profileType }))}
                onNext={() => goToStep("register-password")}
                onBack={() => goToStep("register-phone", -1)}
              />
            )}

            {step === "register-password" && (
              <AuthStepPassword
                onSubmit={handlePasswordRegister}
                onBack={() => goToStep("register-profile-type", -1)}
                loading={loading}
              />
            )}

            {step === "login" && (
              <AuthStepLogin
                email={formData.email}
                profile={existingProfile}
                biometricAvailable={biometricAvailable}
                biometricEnabled={biometricEnabled && storedEmail === formData.email}
                biometricLabel={getBiometryLabel()}
                onBiometricAuth={handleBiometricLogin}
                onPasswordSubmit={handlePasswordLogin}
                onBack={() => goToStep("email", -1)}
                loading={loading}
              />
            )}

            {step === "permissions" && (
              <AuthStepPermissions
                onComplete={handlePermissionsComplete}
                onEnableBiometric={handleEnableBiometric}
                biometricAvailable={biometricAvailable}
                biometricLabel={getBiometryLabel()}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
