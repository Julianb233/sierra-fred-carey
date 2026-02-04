"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Phone, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneVerifyProps {
  onVerified?: (phone: string) => void;
}

export function PhoneVerify({ onVerified }: PhoneVerifyProps) {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCodeSent(true);
    setLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    if (newOtp.every((digit) => digit !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setVerified(true);
    setLoading(false);
    onVerified?.(`${countryCode}${phone}`);
  };

  if (verified) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/30 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-500/20" />
        
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </motion.div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">Phone Verified!</h3>
          <p className="text-sm text-muted-foreground">
            {countryCode} {phone}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {!codeSent ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">Enter Your Phone Number</Label>
            </div>

            <div className="flex gap-3">
              <div className="w-24">
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+1"
                  className="text-center bg-white/10 border-white/20"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="(555) 123-4567"
                  className="bg-white/10 border-white/20"
                />
              </div>
            </div>

            <Button
              onClick={handleSendCode}
              disabled={phone.length < 10 || loading}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
          
          <div className="relative z-10 space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Enter Verification Code</h3>
              <p className="text-sm text-muted-foreground">
                We sent a code to {countryCode} {phone}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digit && index > 0) {
                      const prevInput = document.getElementById(`otp-${index - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/10 border-white/20"
                />
              ))}
            </div>

            <Button
              variant="ghost"
              onClick={() => setCodeSent(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Change Phone Number
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
