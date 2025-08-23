"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 30,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return {
            ...prev,
            days: prev.days - 1,
            hours: 23,
            minutes: 59,
            seconds: 59,
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Here you would typically send the email to your backend
      console.log("Waitlist signup:", email);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="relative">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 border-gray-600 bg-black/40 px-4 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
            required
          />
        </div>
        <Button
          type="submit"
          className="h-12 w-full bg-indigo-600 font-medium text-white hover:bg-indigo-700"
          disabled={isSubmitted}
        >
          {isSubmitted ? "Joined!" : "Get Notified"}
        </Button>
      </form>

      {/* User avatars */}
      <div className="mb-4 flex items-center justify-center">
        <div className="flex -space-x-2">
          {[
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
            "https://images.unsplash.com/photo-1494790108755-2616b612b029?w=40&h=40&fit=crop&crop=face",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
          ].map((src, index) => (
            <div
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-800 bg-gradient-to-br from-purple-400 to-blue-500 text-xs font-medium text-white"
            >
              {index + 1}
            </div>
          ))}
        </div>
        <span className="ml-3 text-sm text-gray-400">
          2k+ Peoples already joined
        </span>
      </div>

      {/* Countdown timer */}
      <div className="rounded-lg border border-gray-700 bg-black/30 p-4 backdrop-blur-sm">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
            <div className="text-xs uppercase text-gray-400">days</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {timeLeft.hours}
            </div>
            <div className="text-xs uppercase text-gray-400">hours</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {timeLeft.minutes}
            </div>
            <div className="text-xs uppercase text-gray-400">minutes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {timeLeft.seconds}
            </div>
            <div className="text-xs uppercase text-gray-400">seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
