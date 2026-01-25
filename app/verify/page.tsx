'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  ArrowRight,
  RefreshCw,
  Mail,
  Clock,
} from 'lucide-react';

const steps = [
  { id: 'verify', label: 'Verifying token' },
  { id: 'auth', label: 'Authenticating' },
  { id: 'redirect', label: 'Redirecting' },
];

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    const verifyToken = async () => {
      try {
        // Step 1: Verifying
        setCurrentStep(0);
        await new Promise(resolve => setTimeout(resolve, 500));

        const response = await fetch(`/api/auth/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        // Step 2: Authenticating
        setCurrentStep(1);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 3: Success
        setCurrentStep(2);
        setStatus('success');

        // Redirect to app after success
        setTimeout(() => {
          router.push('/app');
        }, 1500);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Verbatim</span>
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Loading Animation */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20" />
                  <motion.div
                    className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Verifying your link</h1>
                <p className="text-muted-foreground">Please wait while we sign you in</p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      index === currentStep
                        ? 'bg-primary/10'
                        : index < currentStep
                          ? 'bg-green-500/10'
                          : 'bg-secondary/50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      index === currentStep
                        ? 'bg-primary text-white'
                        : index < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {index < currentStep ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : index === currentStep ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm ${
                      index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
                <p className="text-muted-foreground">You've been signed in successfully</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to dashboard...
              </div>

              {/* Progress bar for redirect */}
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto"
              >
                <XCircle className="w-10 h-10 text-destructive" />
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold mb-2">Verification failed</h1>
                <p className="text-muted-foreground">{error}</p>
              </div>

              {/* Error details card */}
              <div className="card p-4 bg-destructive/5 border-destructive/20 text-left">
                <h3 className="font-medium text-sm mb-2">What might have happened:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    The magic link may have expired (valid for 15 minutes)
                  </li>
                  <li className="flex items-start gap-2">
                    <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    The link may have already been used
                  </li>
                  <li className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    The link may have been copied incorrectly
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Link>
                <Link
                  href="/"
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  Back to home
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-sm text-muted-foreground mt-6"
      >
        Having trouble?{' '}
        <a href="mailto:support@verbatim.app" className="text-primary hover:underline">
          Contact support
        </a>
      </motion.p>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Verbatim</span>
        </div>
      </div>

      <div className="card p-8">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
