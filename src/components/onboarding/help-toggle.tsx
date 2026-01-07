"use client";

import { HelpCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/contexts/onboarding-context";

/**
 * HelpToggle - Settings toggle for tips and help
 *
 * Provides a switch to enable/disable tips globally
 * and a button to reset all dismissed tips.
 */
export function HelpToggle() {
  const { showTips, setShowTips, resetAllTips } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="show-tips" className="text-sm font-normal">
            Show tips and help
          </Label>
        </div>
        <Switch
          id="show-tips"
          checked={showTips}
          onCheckedChange={setShowTips}
        />
      </div>
      {showTips && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetAllTips}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset all tips
        </Button>
      )}
    </div>
  );
}
