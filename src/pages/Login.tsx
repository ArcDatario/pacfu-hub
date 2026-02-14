import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { GraduationCap, ArrowLeft, Loader2, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpCode, setOtpCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [userName, setUserName] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    // First validate credentials
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Invalid credentials');
      return;
    }

    // Get user name from Firestore
    let fetchedName = 'User';
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          fetchedName = userDoc.data().name || 'User';
        }
      }
    } catch {}
    setUserName(fetchedName);

    // Credentials valid - now send verification code
    setSendingCode(true);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-login-code', {
        body: {
          action: 'send',
          email: email,
          name: fetchedName,
        },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to send code');

      toast.success('Verification code sent to your email');
      setStep('otp');
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError('Failed to send verification code. Please try again.');
      // Sign out since we can't verify
      // The user is already signed in from the login call, but we won't redirect
    } finally {
      setSendingCode(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setOtpError('');
    setVerifyingCode(true);

    try {
      const response = await supabase.functions.invoke('send-login-code', {
        body: {
          action: 'verify',
          email: email,
          code: otpCode,
        },
      });

      const data = response.data;
      const fnError = response.error;

      // Handle FunctionsHttpError - parse the response body for the error message
      if (fnError) {
        // Try to get the error message from the response context
        let errorMsg = 'Invalid verification code.';
        try {
          if (fnError.context && typeof fnError.context === 'object') {
            const responseBody = await (fnError.context as Response).json();
            errorMsg = responseBody?.error || errorMsg;
          }
        } catch {}
        setOtpError(errorMsg);
        setVerifyingCode(false);
        return;
      }
      
      if (!data?.success) {
        setOtpError(data?.error || 'Invalid verification code');
        setVerifyingCode(false);
        return;
      }

      toast.success('Login verified successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setOtpError('Failed to verify code. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setSendingCode(true);
    setError('');
    setOtpCode('');
    setOtpError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-login-code', {
        body: {
          action: 'send',
          email: email,
          name: userName,
        },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to resend code');

      toast.success('New verification code sent!');
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      console.error('Error resending code:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setOtpCode('');
    setError('');
    setOtpError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M54.627%200l.83.828-1.415%201.415L51.8%200h2.827zM5.373%200l-.83.828L5.96%202.243%208.2%200H5.374zM48.97%200l3.657%203.657-1.414%201.414L46.143%200h2.828zM11.03%200L7.372%203.657%208.787%205.07%2013.857%200H11.03zm32.284%200L49.8%206.485%2048.384%207.9l-7.9-7.9h2.83zM16.686%200L10.2%206.485%2011.616%207.9l7.9-7.9h-2.83zM22.344%200L13.858%208.485%2015.272%209.9l9.9-9.9h-2.83zM27.998%200l-9.9%209.9%201.415%201.414L29.412%201.415%2028%200h-.002zm5.658%200l-9.9%209.9%201.415%201.414%209.9-9.9L33.657%200h-.001zM39.313%200l-9.9%209.9%201.414%201.414%209.9-9.9L39.312%200h.001zM44.97%200L35.07%209.9%2036.485%2011.314%2046.384%201.414%2044.97%200zM0%205.373l.828-.828%201.415%201.415L0%208.2V5.374zm0%205.656l.828-.828%207.07%207.071L6.485%2018.685%200%2012.2v-1.17zm0%205.658l.828-.828%2012.728%2012.728-1.414%201.414L0%2017.857v-1.17zM0%2022.344l.828-.829%2018.385%2018.385-1.414%201.415L0%2023.515v-1.17zm0%205.656l.828-.828%2024.042%2024.041-1.414%201.415L0%2029.17v-1.17zm0%205.658l.828-.828%2029.698%2029.699-1.414%201.414L0%2034.828v-1.17zm0%205.657l.828-.828%2035.355%2035.356-1.414%201.414L0%2040.485v-1.17zm0%205.657l.828-.828%2041.012%2041.013-1.414%201.414L0%2046.143v-1.17zm0%205.657l.828-.828%2046.669%2046.67-1.414%201.414L0%2051.8v-1.172zm0%205.66l.828-.83L54.828%2060H0v-4.343zM60%205.373L59.17%204.543%2057.758%205.958%2060%208.2V5.374zm0%205.656L59.17%2010.2l-7.07%207.07%201.413%201.415L60%2012.2v-1.17zm0%205.658L59.17%2015.858%2046.442%2028.586l1.414%201.414L60%2017.857v-1.17zm0%205.657L59.17%2021.515%2040.786%2039.9l1.414%201.414L60%2023.515v-1.17zm0%205.657L59.17%2027.17l-24.04%2024.042%201.413%201.414L60%2029.17v-1.17zm0%205.658L59.17%2032.83l-29.698%2029.698%201.414%201.414L60%2034.828v-1.17zm0%205.657L59.17%2038.484l-35.355%2035.355%201.414%201.414L60%2040.485v-1.17zm0%205.657L59.17%2044.14l-41.012%2041.013%201.414%201.414L60%2046.143v-1.17zm0%205.657L59.17%2049.8l-46.67%2046.67%201.415%201.413L60%2051.8v-1.172zm0%205.66L59.17%2055.172%2012.343%2060H60v-4.343z%22%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent shadow-glow">
                <GraduationCap className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-primary-foreground">PACFU</h1>
                <p className="text-sm text-primary-foreground/70">Faculty Portal</p>
              </div>
            </div>
            
            <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight mb-4">
              Empowering PSAU Faculty Through Collaboration
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Your unified platform for announcements, group discussions, document management, and democratic participation.
            </p>
          </div>
          
          <div className="space-y-4 border-l-2 border-accent/30 pl-6">
            <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <p className="text-primary-foreground font-medium">✓ Real-time Communication</p>
              <p className="text-sm text-primary-foreground/60">Stay connected with your colleagues</p>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <p className="text-primary-foreground font-medium">✓ Document Hub</p>
              <p className="text-sm text-primary-foreground/60">Centralized file management</p>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-primary-foreground font-medium">✓ Democratic Voting</p>
              <p className="text-sm text-primary-foreground/60">Participate in polls and elections</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl font-bold text-foreground">PACFU</span>
            </div>
            
            {step === 'credentials' ? (
              <>
                <h2 className="font-display text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="mt-2 text-muted-foreground">
                  Sign in to access your PACFU portal
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold text-foreground">Verify Your Identity</h2>
                <p className="mt-2 text-muted-foreground">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
              </>
            )}
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6 animate-fade-in">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@psau.edu.ph"
                    className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
                  </div>
                  <div className="mt-1.5">
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive animate-shake">{error}</p>
              )}

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-11 transition-all shadow-lg hover:shadow-xl" 
                disabled={isLoading || sendingCode}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</>
                ) : sendingCode ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending code...</>
                ) : (
                  'Sign in'
                )}
              </Button>

              {/* Footer info */}
              <p className="text-center text-sm text-muted-foreground">
                Faculty Portal Access • PSAU
              </p>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Email verification icon with animation */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
                    <Mail className="h-10 w-10 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <ShieldCheck className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="font-display text-2xl font-bold text-foreground">Verify Your Identity</h2>
                <p className="text-muted-foreground text-sm">
                  Enter the 6-digit code sent to
                </p>
                <p className="text-primary font-medium">{email}</p>
              </div>

              {/* OTP Input with better styling */}
              <div className="flex justify-center py-4">
                <div className="relative">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => {
                      setOtpCode(value);
                      setOtpError('');
                    }}
                    className="gap-3"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="flex justify-center gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all duration-300",
                      i < otpCode.length
                        ? "bg-primary w-4"
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Error message */}
              {(otpError || error) && (
                <p className="text-sm text-destructive text-center animate-shake">
                  {otpError || error}
                </p>
              )}

              {/* Verify Button */}
              <Button
                size="lg"
                className={cn(
                  "w-full transition-all duration-300",
                  otpCode.length === 6 
                    ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" 
                    : ""
                )}
                onClick={handleOtpVerify}
                disabled={otpCode.length !== 6 || verifyingCode}
              >
                {verifyingCode ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</>
                ) : otpCode.length === 6 ? (
                  'Verify & Continue'
                ) : (
                  'Enter 6-digit code'
                )}
              </Button>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBack}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={sendingCode || resendCooldown > 0}
                  className={cn(
                    "transition-all",
                    resendCooldown > 0 && "cursor-not-allowed opacity-60"
                  )}
                >
                  {sendingCode ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" />Sending...</>
                  ) : resendCooldown > 0 ? (
                    <><RefreshCw className="h-4 w-4 mr-1" />{resendCooldown}s</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-1" />Resend Code</>
                  )}
                </Button>
              </div>

              {/* Help text */}
              <p className="text-center text-xs text-muted-foreground">
                Code expires in 10 minutes. Don't have access? Contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
