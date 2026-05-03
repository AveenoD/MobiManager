'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

interface FormData {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  city: string;
  state: string;
  gstNumber: string;
}

const STEPS = [
  { id: 1, title: 'Shop Details', icon: Store },
  { id: 2, title: 'Contact Info', icon: User },
  { id: 3, title: 'Location', icon: MapPin },
];

export default function AdminRegister() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    state: '',
    gstNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.shopName.length >= 2 && formData.ownerName.length >= 2;
    }
    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[6-9][0-9]{9}$/;
      return (
        emailRegex.test(formData.email) &&
        phoneRegex.test(formData.phone) &&
        formData.password.length >= 8 &&
        formData.password === formData.confirmPassword
      );
    }
    return true;
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details?.[0]?.message || 'Registration failed');
      }

      router.push('/admin/register/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-4 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100/50 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-indigo-500/10 border border-slate-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-white">MobiManager</h1>
                <p className="text-indigo-200 text-sm">Create Your Shop Account</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {STEPS.map((step, idx) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                        ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-white text-indigo-600' : 'bg-white/20 text-white/60'}
                      `}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-sm font-medium hidden sm:block ${isCurrent ? 'text-white' : 'text-indigo-200'}`}>
                        {step.title}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Step 1: Shop Details */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <label htmlFor="shopName" className="block text-sm font-medium text-slate-700 mb-2">
                        Shop Name *
                      </label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          id="shopName"
                          name="shopName"
                          value={formData.shopName}
                          onChange={handleChange}
                          placeholder="Your Shop Name"
                          className={inputClass + ' pl-12'}
                          required
                          minLength={2}
                          maxLength={150}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="ownerName" className="block text-sm font-medium text-slate-700 mb-2">
                        Owner Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          id="ownerName"
                          name="ownerName"
                          value={formData.ownerName}
                          onChange={handleChange}
                          placeholder="Your Full Name"
                          className={inputClass + ' pl-12'}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Contact Info */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className={inputClass + ' pl-12'}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          className={inputClass + ' pl-12'}
                          required
                          pattern="[6-9][0-9]{9}"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Min 8 characters"
                          className={inputClass + ' pl-12 pr-12'}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Must be at least 8 characters</p>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          className={inputClass + ' pl-12 pr-12'}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Location */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Shop address"
                          className={inputClass + ' pl-12'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="City"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="State"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="gstNumber" className="block text-sm font-medium text-slate-700 mb-2">
                        GST Number <span className="text-slate-400">(optional)</span>
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          id="gstNumber"
                          name="gstNumber"
                          value={formData.gstNumber}
                          onChange={handleChange}
                          placeholder="22AAAAA0000A1Z5"
                          className={inputClass + ' pl-12'}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                )}

                {currentStep < 3 ? (
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Create Account
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </form>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Your data is secure and encrypted</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                Back to Home
              </Link>
              <Link
                href="/admin/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                Already have an account?
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}