"use client";

import { useState } from "react";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, MapPin } from "lucide-react";
import type { Location } from "@/types/schema";

interface LocationSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationSelector({ value, onValueChange, disabled }: LocationSelectorProps) {
  const { locations, isLoading, addLocation, isCreating } = useLocations();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    building: "",
    address: "",
    accessInstructions: "",
  });

  const handleAddNew = async () => {
    if (!newLocation.name.trim()) return;

    const created = await addLocation(newLocation);
    if (created) {
      onValueChange(created.id);
      setIsAddingNew(false);
      setNewLocation({ name: "", building: "", address: "", accessInstructions: "" });
    }
  };

  const selectedLocation = locations.find((loc: Location) => loc.id === value);

  if (isAddingNew) {
    return (
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Add New Location</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingNew(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="location-name" className="text-xs">
              Location Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location-name"
              placeholder="e.g., Van Munching Hall"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="location-building" className="text-xs">Building</Label>
            <Input
              id="location-building"
              placeholder="e.g., Room 1330"
              value={newLocation.building}
              onChange={(e) => setNewLocation({ ...newLocation, building: e.target.value })}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="location-address" className="text-xs">Address</Label>
            <Input
              id="location-address"
              placeholder="e.g., 7699 Mowatt Ln, College Park, MD"
              value={newLocation.address}
              onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="location-instructions" className="text-xs">Access Instructions</Label>
            <Textarea
              id="location-instructions"
              placeholder="e.g., Enter through main entrance, take elevator to 3rd floor"
              value={newLocation.accessInstructions}
              onChange={(e) => setNewLocation({ ...newLocation, accessInstructions: e.target.value })}
              disabled={isCreating}
              rows={2}
            />
          </div>

          <Button
            type="button"
            onClick={handleAddNew}
            disabled={!newLocation.name.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Location"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading locations..." : "Select a location"} />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location: Location) => (
            <SelectItem key={location.id} value={location.id}>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{location.name}</span>
                {location.building && (
                  <span className="text-muted-foreground">- {location.building}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLocation?.address && (
        <p className="text-xs text-muted-foreground">{selectedLocation.address}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsAddingNew(true)}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="mr-2 h-3 w-3" />
        Add New Location
      </Button>
    </div>
  );
}
